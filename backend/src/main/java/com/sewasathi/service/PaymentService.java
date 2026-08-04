package com.sewasathi.service;

import com.sewasathi.dto.response.PaymentInitiationResponse;
import com.sewasathi.dto.response.PaymentResponse;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.PaymentType;
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
 * Collects the two instalments a customer owes on a task.
 *
 * <p>A task a worker has accepted sits in {@link TaskStatus#ACCEPTED} until the
 * {@link PaymentType#ADVANCE} clears; only then does it become {@link TaskStatus#ASSIGNED}
 * and the worker gain the ability to start it. The {@link PaymentType#BALANCE} falls due
 * at the other end, once the worker has finished the work and left the task
 * {@link TaskStatus#AWAITING_PAYMENT}. Settling it is what moves the task to
 * {@link TaskStatus#COMPLETED}, so COMPLETED means "done and paid for".
 *
 * <p>The balance can be paid three ways. eSewa and Khalti verify themselves, so a confirmed
 * gateway payment closes the job on the spot. {@link PaymentProvider#CASH} cannot be verified
 * by anyone but the two people involved: the customer declares it, which writes a PENDING row
 * and tells the worker, and the job closes only when the worker confirms they received it.
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
    private final NotificationService notificationService;
    private final TaskService taskService;
    private final BigDecimal advanceRate;
    private final String frontendUrl;

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            TaskRepository taskRepository,
            UserRepository userRepository,
            EsewaService esewaService,
            KhaltiService khaltiService,
            NotificationService notificationService,
            TaskService taskService,
            @Value("${app.esewa.advance-rate:0.10}") BigDecimal advanceRate,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.notificationService = notificationService;
        this.paymentRepository = paymentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.esewaService = esewaService;
        this.khaltiService = khaltiService;
        this.taskService = taskService;
        this.advanceRate = advanceRate;
        this.frontendUrl = trimTrailingSlash(frontendUrl);
    }

    /** The slice of the budget due up front, e.g. 10% of NPR 2500 is NPR 250.00. */
    public BigDecimal advanceFor(BigDecimal budget) {
        return budget.multiply(advanceRate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * What is left once the advance has been taken. Subtracted from the budget rather than
     * multiplied by {@code 1 - rate}, so the two legs always add back up to exactly the
     * budget however the advance rounded.
     */
    public BigDecimal balanceFor(BigDecimal budget) {
        return budget.setScale(2, RoundingMode.HALF_UP).subtract(advanceFor(budget));
    }

    @Transactional
    public PaymentInitiationResponse initiateAdvance(String customerEmail, Long taskId, PaymentProvider provider) {
        User customer = getUser(customerEmail);
        Task task = getOwnTaskOrThrow(taskId, customer);

        if (isSettled(taskId, PaymentType.ADVANCE)) {
            throw new InvalidOperationException("The advance for this task has already been paid");
        }
        if (task.getStatus() != TaskStatus.ACCEPTED) {
            throw new InvalidOperationException("This task is not waiting for an advance payment");
        }
        if (task.getAssignedWorker() == null) {
            throw new InvalidOperationException("No worker has accepted this task yet");
        }

        return openCheckout(task, customer, PaymentType.ADVANCE, advanceFor(task.getBudget()), provider);
    }

    /**
     * Collects the rest of the price through a gateway, once the worker has finished the work.
     *
     * <p>Cash does not come through here - it has no gateway to open and settles on the
     * worker's word rather than a callback, so it gets {@link #declareCashBalance} instead.
     */
    @Transactional
    public PaymentInitiationResponse initiateBalance(String customerEmail, Long taskId, PaymentProvider provider) {
        if (provider == PaymentProvider.CASH) {
            throw new InvalidOperationException("Cash payments are not made through a gateway");
        }
        User customer = getUser(customerEmail);
        Task task = getOwnTaskOrThrow(taskId, customer);
        validateBalanceDue(task);

        return openCheckout(task, customer, PaymentType.BALANCE, balanceFor(task.getBudget()), provider);
    }

    /**
     * Records that the customer says they handed the worker cash.
     *
     * <p>Nothing can verify this from the outside, so the row is written PENDING and it is the
     * worker pressing confirm - see {@link #confirmCashReceipt} - that settles it and closes
     * the job. Declaring cash is therefore a claim, not a payment, and the task stays
     * {@link TaskStatus#AWAITING_PAYMENT} until the other side agrees.
     */
    @Transactional
    public PaymentResponse declareCashBalance(String customerEmail, Long taskId) {
        User customer = getUser(customerEmail);
        Task task = getOwnTaskOrThrow(taskId, customer);
        validateBalanceDue(task);

        BigDecimal amount = balanceFor(task.getBudget());
        cancelPendingLeg(taskId, PaymentType.BALANCE);

        Payment payment = paymentRepository.save(Payment.builder()
                .task(task)
                .customer(customer)
                .transactionUuid("SS-CASH-" + taskId + "-" + System.currentTimeMillis())
                .amount(amount)
                .taskTotal(task.getBudget())
                .type(PaymentType.BALANCE)
                .provider(PaymentProvider.CASH)
                .status(PaymentStatus.PENDING)
                .build());

        announceCashDeclaration(payment);
        return PaymentResponse.from(payment);
    }

    /**
     * The worker agreeing they were paid in cash. This is the moment the job closes.
     *
     * <p>Only the worker the task is assigned to can answer, and anybody else is told the task
     * does not exist rather than that it is not theirs - the same shape
     * {@link TaskService} uses.
     */
    @Transactional
    public PaymentResponse confirmCashReceipt(String workerEmail, Long taskId) {
        User worker = getUser(workerEmail);
        Payment payment = getDeclaredCashOrThrow(taskId, worker);

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            return PaymentResponse.from(payment);
        }

        payment.setStatus(PaymentStatus.COMPLETED);
        settle(payment);

        return PaymentResponse.from(paymentRepository.save(payment));
    }

    /**
     * The worker saying the cash never arrived. The claim is failed and the task is left
     * {@link TaskStatus#AWAITING_PAYMENT}, so the customer can hand the money over again or
     * switch to a gateway - a rejected claim must not strand the job.
     */
    @Transactional
    public PaymentResponse rejectCashReceipt(String workerEmail, Long taskId) {
        User worker = getUser(workerEmail);
        Payment payment = getDeclaredCashOrThrow(taskId, worker);

        if (payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            announceCashRejected(payment);
        }
        return PaymentResponse.from(payment);
    }

    /**
     * What has to be true before the closing payment can be taken, whichever way it is paid.
     *
     * <p>The advance is required to have settled first. It always will have in practice -
     * nothing reaches {@link TaskStatus#AWAITING_PAYMENT} without passing through ASSIGNED,
     * which only a settled advance opens - but checking it here means the balance can never
     * be the first money taken on a task, whatever else changes upstream.
     */
    private void validateBalanceDue(Task task) {
        if (task.getStatus() != TaskStatus.AWAITING_PAYMENT) {
            throw new InvalidOperationException(
                    "The balance is only due once the worker has finished this task");
        }
        if (!isSettled(task.getId(), PaymentType.ADVANCE)) {
            throw new InvalidOperationException("The advance on this task has not been paid");
        }
        if (isSettled(task.getId(), PaymentType.BALANCE)) {
            throw new InvalidOperationException("This task has already been paid in full");
        }
    }

    /**
     * The cash claim awaiting this worker's answer. A PENDING row is the normal case; an
     * already-COMPLETED one is returned too so a double click confirms idempotently rather
     * than 404ing on the second press.
     */
    private Payment getDeclaredCashOrThrow(Long taskId, User worker) {
        return paymentRepository
                .findByTaskIdAndTypeAndProviderAndStatusIn(taskId, PaymentType.BALANCE,
                        PaymentProvider.CASH,
                        List.of(PaymentStatus.PENDING, PaymentStatus.COMPLETED)).stream()
                .filter(p -> {
                    User assigned = p.getTask().getAssignedWorker();
                    return assigned != null && assigned.getId().equals(worker.getId());
                })
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No cash payment to confirm on task " + taskId));
    }

    /**
     * The half both legs share: abandon whatever the customer walked away from last time,
     * write a fresh PENDING row, and hand the browser over to the gateway.
     */
    private PaymentInitiationResponse openCheckout(
            Task task, User customer, PaymentType type, BigDecimal amount, PaymentProvider provider) {
        Long taskId = task.getId();
        cancelPendingLeg(taskId, type);

        Payment payment = paymentRepository.save(Payment.builder()
                .task(task)
                .customer(customer)
                .transactionUuid("SS-" + taskId + "-" + System.currentTimeMillis())
                .amount(amount)
                .taskTotal(task.getBudget())
                .type(type)
                .provider(provider)
                .status(PaymentStatus.PENDING)
                .build());

        return switch (provider) {
            case ESEWA -> initiateEsewa(payment, taskId, amount, task.getBudget());
            case KHALTI -> initiateKhalti(payment, task, customer, amount);
            // Unreachable - the callers reject CASH before they get here. Listed so the
            // compiler keeps this switch honest if a provider is ever added.
            case CASH -> throw new InvalidOperationException(
                    "Cash payments are not made through a gateway");
        };
    }

    /**
     * Abandons whatever attempt the customer walked away from last time. Scoped to one leg,
     * so retrying a balance cannot cancel anything belonging to the advance - and switching
     * between cash and a gateway on the same leg cleanly replaces the earlier claim.
     */
    private void cancelPendingLeg(Long taskId, PaymentType type) {
        paymentRepository.findByTaskIdAndTypeAndStatus(taskId, type, PaymentStatus.PENDING)
                .forEach(stale -> {
                    stale.setStatus(PaymentStatus.CANCELLED);
                    paymentRepository.save(stale);
                });
    }

    private boolean isSettled(Long taskId, PaymentType type) {
        return paymentRepository.existsByTaskIdAndTypeAndStatus(taskId, type, PaymentStatus.COMPLETED);
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
        settle(payment);

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
        settle(payment);

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
     * What a freshly settled payment does to the world, which depends entirely on which leg
     * it was. An advance confirms the booking and lets the worker start; a balance closes the
     * job out and is the moment the worker is actually owed nothing.
     */
    private void settle(Payment payment) {
        if (payment.getType() == PaymentType.BALANCE) {
            taskService.markPaidInFull(payment.getTask());
            announceSettlement(payment);
        } else {
            promoteTask(payment.getTask());
        }
        sendReceipt(payment);
    }

    /**
     * Confirms a settled payment to the customer.
     *
     * <p>This used to be an emailed receipt. With no mail channel the confirmation goes to
     * the in-app notification feed instead - a payment that produced no acknowledgement at
     * all would leave the customer unsure whether their money had landed. The payment page
     * remains the authoritative record.
     */
    private void sendReceipt(Payment payment) {
        Task task = payment.getTask();
        String amount = "NPR " + payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        String via = providerLabel(payment.getProvider());
        boolean balance = payment.getType() == PaymentType.BALANCE;

        notificationService.notify(payment.getCustomer(), "PAYMENT_RECEIVED",
                balance ? "Task paid in full" : "Payment received",
                amount + (balance ? " final payment" : " advance") + " paid via " + via
                        + " for \"" + task.getTitle()
                        + "\". Reference " + payment.getTransactionUuid() + ".",
                "/dashboard/payments");
    }

    /** How a provider is written in a notification. */
    private static String providerLabel(PaymentProvider provider) {
        return switch (provider) {
            case ESEWA -> "eSewa";
            case KHALTI -> "Khalti";
            case CASH -> "cash";
        };
    }

    /**
     * Tells the worker the rest of their money has landed and the job is closed.
     *
     * <p>Skipped for cash, where the worker is the one who just confirmed it - telling them
     * what they have this second told us would be noise.
     */
    private void announceSettlement(Payment payment) {
        Task task = payment.getTask();
        User worker = task.getAssignedWorker();
        if (worker == null || payment.getProvider() == PaymentProvider.CASH) {
            return;
        }

        String amount = "NPR " + payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        notificationService.notify(worker, "PAYMENT_RECEIVED",
                "Final payment received",
                task.getCustomer().getFullName() + " paid the remaining " + amount + " on \""
                        + task.getTitle() + "\". That job is now paid in full.",
                "/worker/earnings");
    }

    /**
     * Asks the worker to vouch for cash the customer says they handed over. This notification
     * is the whole mechanism - without it a worker has no reason to look at a job they have
     * already finished.
     */
    private void announceCashDeclaration(Payment payment) {
        Task task = payment.getTask();
        User worker = task.getAssignedWorker();
        if (worker == null) {
            return;
        }

        String amount = "NPR " + payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        notificationService.notify(worker, "CASH_DECLARED",
                "Confirm a cash payment",
                task.getCustomer().getFullName() + " says they paid you " + amount + " in cash "
                        + "for \"" + task.getTitle() + "\". Confirm it to close the job.",
                "/worker/earnings");
    }

    /** Tells the customer the worker says the cash never arrived, and where to put that right. */
    private void announceCashRejected(Payment payment) {
        Task task = payment.getTask();
        User worker = task.getAssignedWorker();
        String workerName = worker == null ? "The worker" : worker.getFullName();

        notificationService.notify(payment.getCustomer(), "CASH_REJECTED",
                "Cash payment not confirmed",
                workerName + " has not received the cash for \"" + task.getTitle()
                        + "\". Hand it over again or settle by eSewa or Khalti.",
                "/dashboard/checkout/" + task.getId());
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
