package com.sewasathi.service;

import com.sewasathi.dto.response.PaymentInitiationResponse;
import com.sewasathi.dto.response.PaymentResponse;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Collects the advance a customer owes to confirm a task.
 *
 * <p>A task a worker has accepted sits in {@link TaskStatus#ACCEPTED} until the
 * advance clears; only then does it become {@link TaskStatus#ASSIGNED} and the
 * worker gain the ability to start it.
 */
@Service
public class PaymentService {

    private static final String SUCCESS_PATH = "/dashboard/payments/esewa/success";
    private static final String FAILURE_PATH = "/dashboard/payments/esewa/failure/";
    /** Khalti allows one return URL for every outcome, so this page handles them all. */
    private static final String KHALTI_RETURN_PATH = "/dashboard/payments/khalti/callback";

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private static final DateTimeFormatter RECEIPT_DATE = DateTimeFormatter.ofPattern("MMM d, yyyy HH:mm");

    private final PaymentRepository paymentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final EsewaService esewaService;
    private final KhaltiService khaltiService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final BigDecimal advanceRate;
    private final String frontendUrl;

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            TaskRepository taskRepository,
            UserRepository userRepository,
            EsewaService esewaService,
            KhaltiService khaltiService,
            EmailService emailService,
            NotificationService notificationService,
            @Value("${app.esewa.advance-rate:0.10}") BigDecimal advanceRate,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.notificationService = notificationService;
        this.paymentRepository = paymentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.esewaService = esewaService;
        this.khaltiService = khaltiService;
        this.emailService = emailService;
        this.advanceRate = advanceRate;
        this.frontendUrl = trimTrailingSlash(frontendUrl);
    }

    /** The slice of the budget due up front, e.g. 10% of NPR 2500 is NPR 250.00. */
    public BigDecimal advanceFor(BigDecimal budget) {
        return budget.multiply(advanceRate).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public PaymentInitiationResponse initiateAdvance(String customerEmail, Long taskId, PaymentProvider provider) {
        User customer = getUser(customerEmail);
        Task task = getOwnTaskOrThrow(taskId, customer);

        if (paymentRepository.existsByTaskIdAndStatus(taskId, PaymentStatus.COMPLETED)) {
            throw new InvalidOperationException("The advance for this task has already been paid");
        }
        if (task.getStatus() != TaskStatus.ACCEPTED) {
            throw new InvalidOperationException("This task is not waiting for an advance payment");
        }
        if (task.getAssignedWorker() == null) {
            throw new InvalidOperationException("No worker has accepted this task yet");
        }

        // Starting a new checkout abandons any attempt the customer walked away from.
        paymentRepository.findByTaskIdAndStatus(taskId, PaymentStatus.PENDING).forEach(stale -> {
            stale.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(stale);
        });

        BigDecimal amount = advanceFor(task.getBudget());
        Payment payment = paymentRepository.save(Payment.builder()
                .task(task)
                .customer(customer)
                .transactionUuid("SS-" + taskId + "-" + System.currentTimeMillis())
                .amount(amount)
                .taskTotal(task.getBudget())
                .provider(provider)
                .status(PaymentStatus.PENDING)
                .build());

        return switch (provider) {
            case ESEWA -> initiateEsewa(payment, taskId, amount, task.getBudget());
            case KHALTI -> initiateKhalti(payment, task, customer, amount);
        };
    }

    /** eSewa is entered by POSTing a signed form, so the browser gets the fields to submit. */
    private PaymentInitiationResponse initiateEsewa(
            Payment payment, Long taskId, BigDecimal amount, BigDecimal taskTotal) {
        Map<String, String> fields = esewaService.buildFormFields(
                payment.getTransactionUuid(),
                esewaService.formatAmount(amount),
                frontendUrl + SUCCESS_PATH,
                frontendUrl + FAILURE_PATH + taskId
        );

        return new PaymentInitiationResponse(
                payment.getTransactionUuid(),
                PaymentProvider.ESEWA,
                amount,
                taskTotal,
                esewaService.getFormUrl(),
                fields,
                null
        );
    }

    /**
     * Khalti is opened server-to-server first: it mints a {@code pidx} and a link, and
     * the browser is simply sent to that link. The {@code pidx} is stored now because it
     * is the only thing tying the return trip back to this payment — and storing it here
     * rather than trusting the redirect is what stops one customer confirming another's
     * payment. If Khalti refuses, the exception rolls this whole transaction back and no
     * unpayable payment row survives.
     */
    private PaymentInitiationResponse initiateKhalti(
            Payment payment, Task task, User customer, BigDecimal amount) {
        KhaltiInitiateResponse opened = khaltiService.initiate(
                payment.getTransactionUuid(),
                task.getTitle(),
                khaltiService.toPaisa(amount),
                frontendUrl + KHALTI_RETURN_PATH,
                new KhaltiCustomer(customer.getFullName(), customer.getEmail(), customer.getPhone())
        );

        payment.setProviderRef(opened.pidx());
        paymentRepository.save(payment);

        return new PaymentInitiationResponse(
                payment.getTransactionUuid(),
                PaymentProvider.KHALTI,
                amount,
                task.getBudget(),
                null,
                Map.of(),
                opened.paymentUrl()
        );
    }

    /**
     * Settles the payment eSewa redirected the customer back from, and promotes the
     * task to {@link TaskStatus#ASSIGNED}. Safe to call twice with the same payload —
     * a refresh of the success page is a no-op.
     */
    @Transactional
    public PaymentResponse completeEsewa(String customerEmail, String encodedData) {
        User customer = getUser(customerEmail);
        EsewaCallbackPayload payload = esewaService.decodeCallback(encodedData);

        Payment payment = paymentRepository.findByTransactionUuid(payload.transactionUuid())
                .filter(p -> p.getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No payment with reference " + payload.transactionUuid()));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            return PaymentResponse.from(payment);
        }

        if (!confirmWithEsewa(payment, payload)) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new InvalidOperationException("eSewa did not confirm this payment. Please try again.");
        }

        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setTransactionCode(payload.transactionCode());
        promoteTask(payment.getTask());
        sendReceipt(payment);

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    /**
     * Settles the payment Khalti redirected the customer back from, and promotes the
     * task to {@link TaskStatus#ASSIGNED}. Safe to call twice with the same {@code pidx}.
     *
     * <p>Khalti does not sign its redirect, so the lookup API is the <em>only</em>
     * authority here — there is no signed-callback fallback as there is for eSewa. An
     * unreachable gateway therefore fails the payment rather than trusting query
     * parameters the customer's own browser handed us.
     */
    @Transactional
    public PaymentResponse completeKhalti(String customerEmail, String pidx) {
        User customer = getUser(customerEmail);

        Payment payment = paymentRepository.findByProviderRef(pidx)
                .filter(p -> p.getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("No payment with reference " + pidx));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            return PaymentResponse.from(payment);
        }

        KhaltiLookupResponse lookup = khaltiService.lookup(pidx);
        if (lookup == null || !lookup.isCompleted() || !paisaMatches(payment, lookup.totalAmount())) {
            log.info("Khalti did not confirm {}: {}", pidx,
                    lookup == null ? "lookup unreachable" : "status=" + lookup.status()
                            + ", total_amount=" + lookup.totalAmount());
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new InvalidOperationException("Khalti did not confirm this payment. Please try again.");
        }

        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setRefId(lookup.transactionId());
        promoteTask(payment.getTask());
        sendReceipt(payment);

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    /** Records that the customer bailed out at the gateway. The task stays payable. */
    @Transactional
    public PaymentResponse markFailed(String customerEmail, String transactionUuid) {
        User customer = getUser(customerEmail);
        Payment payment = paymentRepository.findByTransactionUuid(transactionUuid)
                .filter(p -> p.getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("No payment with reference " + transactionUuid));

        if (payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
        }
        return PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listMyPayments(String customerEmail) {
        User customer = getUser(customerEmail);
        return paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream()
                .map(PaymentResponse::from)
                .toList();
    }

    // --- helpers ---

    /**
     * Decides whether a payment really settled, and records eSewa's reference id.
     *
     * <p>The status API is the authority: it is server-to-server, so a customer who
     * controls their own browser cannot forge it, and it is where {@code ref_id} comes
     * from. When it gives a definite answer that answer wins outright — a transaction
     * eSewa reports as PENDING or CANCELED is not settled, whatever the redirect claims.
     *
     * <p>A validly signed COMPLETE callback is only honoured when the status endpoint is
     * unreachable, which the sandbox occasionally is. That is safe because the HMAC is
     * cut with a secret only eSewa and we hold.
     */
    private boolean confirmWithEsewa(Payment payment, EsewaCallbackPayload payload) {
        EsewaStatusResponse status = esewaService.checkStatus(
                payment.getTransactionUuid(), esewaService.formatAmount(payment.getAmount()));

        if (status != null) {
            if (status.isComplete()) {
                payment.setRefId(status.refId());
                return true;
            }
            log.info("eSewa reports {} for {}", status.status(), payment.getTransactionUuid());
            return false;
        }

        boolean signedComplete = esewaService.verifyCallbackSignature(payload)
                && amountMatches(payment, payload.totalAmount())
                && EsewaStatusResponse.COMPLETE.equalsIgnoreCase(payload.status());
        if (signedComplete) {
            log.warn("eSewa status endpoint unreachable; accepting signed callback for {}",
                    payment.getTransactionUuid());
            return true;
        }
        log.info("eSewa did not confirm {}: callback status={}, status endpoint unreachable",
                payment.getTransactionUuid(), payload.status());
        return false;
    }

    /**
     * Emails the customer a receipt for a settled advance payment.
     *
     * <p>Values are read out here rather than passed as entities: delivery happens on a
     * mail worker thread after this transaction closes, and a lazy proxy dereferenced
     * there would blow up with {@code open-in-view=false}. Delivery failures are absorbed
     * by the mail layer - a paid booking must never be rolled back because the mail
     * server was unreachable.
     */
    private void sendReceipt(Payment payment) {
        Task task = payment.getTask();
        Map<String, String> details = new LinkedHashMap<>();
        details.put("Task", task.getTitle());
        details.put("Amount paid", "NPR " + payment.getAmount().setScale(2, RoundingMode.HALF_UP));
        details.put("Paid via", payment.getProvider() == PaymentProvider.ESEWA ? "eSewa" : "Khalti");
        details.put("Reference", payment.getTransactionUuid());
        details.put("Date", LocalDateTime.now().format(RECEIPT_DATE));

        emailService.sendTemplate(
                payment.getCustomer().getEmail(),
                "Your Sewa Sathi payment receipt",
                "email/payment-receipt",
                Map.of(
                        "name", payment.getCustomer().getFullName(),
                        "details", details,
                        "actionUrl", frontendUrl + "/dashboard/payments"
                )
        );
    }

    /** A worker already at work must not be dragged back to {@link TaskStatus#ASSIGNED}. */
    private void promoteTask(Task task) {
        if (task.getStatus() == TaskStatus.ACCEPTED) {
            task.setStatus(TaskStatus.ASSIGNED);
            taskRepository.save(task);
            announceAssignment(task);
        }
    }

    /**
     * Tells both sides the booking is now confirmed. This is the moment that matters -
     * acceptTask only marks a task ACCEPTED, which is still pending the advance payment.
     */
    private void announceAssignment(Task task) {
        User customer = task.getCustomer();
        User worker = task.getAssignedWorker();
        if (worker == null) {
            return;
        }

        notificationService.notify(customer, "TASK_ASSIGNED",
                "Your booking is confirmed",
                worker.getFullName() + " is confirmed for \"" + task.getTitle() + "\".",
                "/dashboard/tasks");

        notificationService.notify(worker, "TASK_ASSIGNED",
                "A job was confirmed",
                "The advance for \"" + task.getTitle() + "\" has been paid. You can start when ready.",
                "/worker/jobs");

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Task", task.getTitle());
        details.put("Worker", worker.getFullName());
        details.put("Status", "Assigned");

        emailService.sendTemplate(
                customer.getEmail(),
                "Your Sewa Sathi booking is confirmed",
                "email/task-assigned",
                Map.of(
                        "name", customer.getFullName(),
                        "workerName", worker.getFullName(),
                        "details", details,
                        "actionUrl", frontendUrl + "/dashboard/tasks"
                )
        );
    }

    /** Khalti reports in paisa, so the comparison happens in paisa too. */
    private boolean paisaMatches(Payment payment, Long reportedPaisa) {
        return reportedPaisa != null && reportedPaisa == khaltiService.toPaisa(payment.getAmount());
    }

    /** Guards against a tampered redirect claiming a smaller amount than we charged. */
    private boolean amountMatches(Payment payment, String reportedTotal) {
        if (reportedTotal == null) {
            return false;
        }
        try {
            BigDecimal reported = new BigDecimal(reportedTotal.replace(",", "").trim());
            return reported.compareTo(payment.getAmount()) == 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }

    private Task getOwnTaskOrThrow(Long taskId, User customer) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("No task with id " + taskId));
        if (!task.getCustomer().getId().equals(customer.getId())) {
            throw new ResourceNotFoundException("No task with id " + taskId);
        }
        return task;
    }

    private static String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
