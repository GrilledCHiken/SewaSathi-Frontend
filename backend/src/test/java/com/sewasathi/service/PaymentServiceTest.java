package com.sewasathi.service;

import com.sewasathi.dto.response.PaymentInitiationResponse;
import com.sewasathi.dto.response.PaymentResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final String UUID = "SS-100-1730000000000";
    private static final String PIDX = "bZQLD9wRVWo4CdESSfuSsB";

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EsewaService esewaService;

    @Mock
    private KhaltiService khaltiService;

    @Mock
    private NotificationService notificationService;

    private PaymentService paymentService;

    private User customer;
    private User otherCustomer;
    private User worker;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(
                paymentRepository, taskRepository, userRepository, esewaService, khaltiService,
                notificationService, new BigDecimal("0.10"), "http://localhost:5174"
        );

        customer = User.builder()
                .id(1L).email("customer@example.com").fullName("Customer One")
                .phone("9800000001").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        otherCustomer = User.builder()
                .id(2L).email("other@example.com").fullName("Customer Two")
                .phone("9800000002").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        worker = User.builder()
                .id(3L).email("worker@example.com").fullName("Worker One")
                .phone("9800000003").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();

        lenient().when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(taskRepository.save(any(Task.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Task acceptedTask() {
        return Task.builder()
                .id(100L).customer(customer).assignedWorker(worker)
                .title("Deep clean").category("Cleaning").description("desc")
                .city("Kathmandu").location("Baneshwor")
                .budget(new BigDecimal("2500")).status(TaskStatus.ACCEPTED)
                .build();
    }

    private Payment pendingPayment(Task task) {
        return Payment.builder()
                .id(50L).task(task).customer(customer).transactionUuid(UUID)
                .amount(new BigDecimal("250.00")).taskTotal(task.getBudget())
                .provider(PaymentProvider.ESEWA).status(PaymentStatus.PENDING)
                .build();
    }

    private Payment pendingKhaltiPayment(Task task) {
        return Payment.builder()
                .id(51L).task(task).customer(customer).transactionUuid(UUID).providerRef(PIDX)
                .amount(new BigDecimal("250.00")).taskTotal(task.getBudget())
                .provider(PaymentProvider.KHALTI).status(PaymentStatus.PENDING)
                .build();
    }

    private KhaltiLookupResponse lookup(String status, Long totalPaisa) {
        return new KhaltiLookupResponse(PIDX, totalPaisa, status, "GFq9PFS7b2iYvL8Lir9oXe", 0L, false);
    }

    private EsewaCallbackPayload callback(String status, String totalAmount) {
        return new EsewaCallbackPayload("000AWEO", status, totalAmount, UUID, "EPAYTEST",
                "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
                "signature");
    }

    // --- initiate ---

    @Test
    void initiateAdvance_chargesTenPercentOfTheBudget() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndStatus(100L, PaymentStatus.PENDING)).thenReturn(List.of());
        when(esewaService.formatAmount(new BigDecimal("250.00"))).thenReturn("250");
        when(esewaService.getFormUrl()).thenReturn("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
        when(esewaService.buildFormFields(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of("total_amount", "250"));

        PaymentInitiationResponse response =
                paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.ESEWA);

        assertThat(response.getAmount()).isEqualByComparingTo("250.00");
        assertThat(response.getTaskTotal()).isEqualByComparingTo("2500");
        assertThat(response.getProvider()).isEqualTo(PaymentProvider.ESEWA);
        assertThat(response.getFields()).containsEntry("total_amount", "250");

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(captor.getValue().getAmount()).isEqualByComparingTo("250.00");
        assertThat(captor.getValue().getTaskTotal()).isEqualByComparingTo("2500");
    }

    @Test
    void initiateAdvance_sendsSuccessAndFailureUrlsBackToTheDashboard() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndStatus(100L, PaymentStatus.PENDING)).thenReturn(List.of());
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.buildFormFields(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of());

        paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.ESEWA);

        verify(esewaService).buildFormFields(
                anyString(),
                anyString(),
                org.mockito.ArgumentMatchers.eq("http://localhost:5174/dashboard/payments/esewa/success"),
                org.mockito.ArgumentMatchers.eq("http://localhost:5174/dashboard/payments/esewa/failure/100")
        );
    }

    @Test
    void initiateAdvance_supersedesAnAbandonedAttempt() {
        Task task = acceptedTask();
        Payment abandoned = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndStatus(100L, PaymentStatus.PENDING))
                .thenReturn(List.of(abandoned));
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.buildFormFields(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of());

        paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.ESEWA);

        assertThat(abandoned.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
    }

    @Test
    void initiateAdvance_forKhalti_returnsTheLinkKhaltiMintedAndRemembersItsPidx() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndStatus(100L, PaymentStatus.PENDING)).thenReturn(List.of());
        when(khaltiService.toPaisa(new BigDecimal("250.00"))).thenReturn(25_000L);
        when(khaltiService.initiate(anyString(), anyString(), anyLong(), anyString(), any()))
                .thenReturn(new KhaltiInitiateResponse(
                        PIDX, "https://test-pay.khalti.com/?pidx=" + PIDX, null, 1800));

        PaymentInitiationResponse response =
                paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.KHALTI);

        assertThat(response.getProvider()).isEqualTo(PaymentProvider.KHALTI);
        assertThat(response.getAmount()).isEqualByComparingTo("250.00");
        assertThat(response.getRedirectUrl()).isEqualTo("https://test-pay.khalti.com/?pidx=" + PIDX);
        // Khalti is a plain GET redirect — there is no form for the browser to submit.
        assertThat(response.getFormUrl()).isNull();
        assertThat(response.getFields()).isEmpty();

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        Payment saved = captor.getAllValues().getLast();
        assertThat(saved.getProvider()).isEqualTo(PaymentProvider.KHALTI);
        assertThat(saved.getProviderRef()).isEqualTo(PIDX);
        assertThat(saved.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void initiateAdvance_forKhalti_sendsTheAdvanceInPaisaAndOneReturnUrl() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndStatus(100L, PaymentStatus.PENDING)).thenReturn(List.of());
        when(khaltiService.toPaisa(any())).thenReturn(25_000L);
        when(khaltiService.initiate(anyString(), anyString(), anyLong(), anyString(), any()))
                .thenReturn(new KhaltiInitiateResponse(PIDX, "https://test-pay.khalti.com/", null, 1800));

        paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.KHALTI);

        verify(khaltiService).initiate(
                anyString(),
                org.mockito.ArgumentMatchers.eq("Deep clean"),
                org.mockito.ArgumentMatchers.eq(25_000L),
                org.mockito.ArgumentMatchers.eq(
                        "http://localhost:5174/dashboard/payments/khalti/callback"),
                org.mockito.ArgumentMatchers.eq(new KhaltiCustomer(
                        "Customer One", "customer@example.com", "9800000001"))
        );
    }

    @Test
    void initiateAdvance_forKhalti_whenTheGatewayRefuses_leavesNoUnpayablePayment() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndStatus(100L, PaymentStatus.PENDING)).thenReturn(List.of());
        when(khaltiService.toPaisa(any())).thenReturn(25_000L);
        when(khaltiService.initiate(anyString(), anyString(), anyLong(), anyString(), any()))
                .thenThrow(new InvalidOperationException("Khalti could not start this payment."));

        // The exception propagates, so the @Transactional rolls the PENDING row back.
        assertThatThrownBy(() ->
                paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.KHALTI))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void initiateAdvance_onATaskNotAwaitingPayment_isRejected() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() ->
                paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("not waiting for an advance payment");
    }

    @Test
    void initiateAdvance_whenAlreadyPaid_isRejected() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.existsByTaskIdAndStatus(100L, PaymentStatus.COMPLETED)).thenReturn(true);

        assertThatThrownBy(() ->
                paymentService.initiateAdvance("customer@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("already been paid");
    }

    @Test
    void initiateAdvance_onSomeoneElsesTask_isTreatedAsNotFound() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() ->
                paymentService.initiateAdvance("other@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- complete ---

    @Test
    void completeEsewa_promotesTheTaskToAssigned() {
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.checkStatus(UUID, "250"))
                .thenReturn(new EsewaStatusResponse("EPAYTEST", UUID, "250", "COMPLETE", "0001TS9"));

        PaymentResponse response = paymentService.completeEsewa("customer@example.com", "data");

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(response.getRefId()).isEqualTo("0001TS9");
        assertThat(response.getTask().getStatus()).isEqualTo(TaskStatus.ASSIGNED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ASSIGNED);
        verify(taskRepository).save(task);
    }

    @Test
    void completeEsewa_isIdempotentSoRefreshingTheSuccessPageIsHarmless() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        Payment payment = pendingPayment(task);
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setRefId("0001TS9");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));

        PaymentResponse response = paymentService.completeEsewa("customer@example.com", "data");

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        // A worker already at work must not be dragged back to ASSIGNED.
        assertThat(task.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(esewaService, never()).checkStatus(anyString(), anyString());
        verify(taskRepository, never()).save(any());
    }

    @Test
    void completeEsewa_acceptsASignedCallbackWhenTheStatusApiIsUnreachable() {
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));
        when(esewaService.verifyCallbackSignature(any())).thenReturn(true);
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.checkStatus(UUID, "250")).thenReturn(null);

        PaymentResponse response = paymentService.completeEsewa("customer@example.com", "data");

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ASSIGNED);
    }

    @Test
    void completeEsewa_trustsAPendingStatusApiOverASignedCompleteCallback() {
        // Observed live: eSewa creates the booking and reports PENDING until the
        // customer actually authorises it. A redirect claiming COMPLETE must not win.
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.checkStatus(UUID, "250"))
                .thenReturn(new EsewaStatusResponse("EPAYTEST", UUID, "250", "PENDING", null));

        assertThatThrownBy(() -> paymentService.completeEsewa("customer@example.com", "data"))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
        // The signature is irrelevant once eSewa has given a definite answer.
        verify(esewaService, never()).verifyCallbackSignature(any());
    }

    @Test
    void completeEsewa_rejectsAnUnsignedCallbackTheStatusApiCannotBackUp() {
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));
        when(esewaService.verifyCallbackSignature(any())).thenReturn(false);
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.checkStatus(UUID, "250")).thenReturn(null);

        assertThatThrownBy(() -> paymentService.completeEsewa("customer@example.com", "data"))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void completeEsewa_withASignedButShortPaidAmount_isRejected() {
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        // Signature is genuine but the amount is a tenth of what we charged.
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "25"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));
        when(esewaService.verifyCallbackSignature(any())).thenReturn(true);
        when(esewaService.formatAmount(any())).thenReturn("250");
        when(esewaService.checkStatus(UUID, "250")).thenReturn(null);

        assertThatThrownBy(() -> paymentService.completeEsewa("customer@example.com", "data"))
                .isInstanceOf(InvalidOperationException.class);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void completeEsewa_forAnotherCustomersPayment_isTreatedAsNotFound() {
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.completeEsewa("other@example.com", "data"))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    // --- complete (Khalti) ---

    @Test
    void completeKhalti_promotesTheTaskToAssigned() {
        Task task = acceptedTask();
        Payment payment = pendingKhaltiPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByProviderRef(PIDX)).thenReturn(Optional.of(payment));
        when(khaltiService.toPaisa(any())).thenReturn(25_000L);
        when(khaltiService.lookup(PIDX)).thenReturn(lookup("Completed", 25_000L));

        PaymentResponse response = paymentService.completeKhalti("customer@example.com", PIDX);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(response.getRefId()).isEqualTo("GFq9PFS7b2iYvL8Lir9oXe");
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ASSIGNED);
        verify(taskRepository).save(task);
    }

    @Test
    void completeKhalti_isIdempotentSoRefreshingTheReturnPageIsHarmless() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        Payment payment = pendingKhaltiPayment(task);
        payment.setStatus(PaymentStatus.COMPLETED);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByProviderRef(PIDX)).thenReturn(Optional.of(payment));

        PaymentResponse response = paymentService.completeKhalti("customer@example.com", PIDX);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        verify(khaltiService, never()).lookup(anyString());
        verify(taskRepository, never()).save(any());
    }

    @Test
    void completeKhalti_whenTheLookupIsUnreachable_failsThePayment() {
        // Khalti signs nothing, so unlike eSewa there is no callback worth falling back on.
        Task task = acceptedTask();
        Payment payment = pendingKhaltiPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByProviderRef(PIDX)).thenReturn(Optional.of(payment));
        when(khaltiService.lookup(PIDX)).thenReturn(null);

        assertThatThrownBy(() -> paymentService.completeKhalti("customer@example.com", PIDX))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void completeKhalti_whenKhaltiStillReportsPending_failsThePayment() {
        Task task = acceptedTask();
        Payment payment = pendingKhaltiPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByProviderRef(PIDX)).thenReturn(Optional.of(payment));
        when(khaltiService.lookup(PIDX)).thenReturn(lookup("Pending", 25_000L));

        assertThatThrownBy(() -> paymentService.completeKhalti("customer@example.com", PIDX))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void completeKhalti_whenTheAmountPaidIsShort_isRejected() {
        Task task = acceptedTask();
        Payment payment = pendingKhaltiPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByProviderRef(PIDX)).thenReturn(Optional.of(payment));
        when(khaltiService.toPaisa(any())).thenReturn(25_000L);
        // A tenth of the advance, reported as Completed.
        when(khaltiService.lookup(PIDX)).thenReturn(lookup("Completed", 2_500L));

        assertThatThrownBy(() -> paymentService.completeKhalti("customer@example.com", PIDX))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void completeKhalti_forAnotherCustomersPayment_isTreatedAsNotFound() {
        Task task = acceptedTask();
        Payment payment = pendingKhaltiPayment(task);
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(paymentRepository.findByProviderRef(PIDX)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> paymentService.completeKhalti("other@example.com", PIDX))
                .isInstanceOf(ResourceNotFoundException.class);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
        verify(khaltiService, never()).lookup(anyString());
    }

    // --- fail ---

    @Test
    void markFailed_leavesTheTaskPayableForAnotherAttempt() {
        Task task = acceptedTask();
        Payment payment = pendingPayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));

        PaymentResponse response = paymentService.markFailed("customer@example.com", UUID);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }

    @Test
    void markFailed_doesNotUndoASettledPayment() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.ASSIGNED);
        Payment payment = pendingPayment(task);
        payment.setStatus(PaymentStatus.COMPLETED);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));

        PaymentResponse response = paymentService.markFailed("customer@example.com", UUID);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ASSIGNED);
    }

    @Test
    void advanceFor_roundsToTwoDecimals() {
        assertThat(paymentService.advanceFor(new BigDecimal("2500"))).isEqualByComparingTo("250.00");
        assertThat(paymentService.advanceFor(new BigDecimal("1999"))).isEqualByComparingTo("199.90");
        assertThat(paymentService.advanceFor(new BigDecimal("1234.56"))).isEqualByComparingTo("123.46");
    }
}
