package com.sewasathi.service;

import com.sewasathi.dto.response.PaymentInitiationResponse;
import com.sewasathi.dto.response.PaymentResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.PaymentType;
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

    @Mock
    private TaskService taskService;

    private PaymentService paymentService;

    private User customer;
    private User otherCustomer;
    private User worker;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(
                paymentRepository, taskRepository, userRepository, esewaService, khaltiService,
                notificationService, taskService, new BigDecimal("0.10"), "http://localhost:5174"
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

    /** The other end of the lifecycle: the worker has finished and the balance is due. */
    private Task awaitingPaymentTask() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.AWAITING_PAYMENT);
        return task;
    }

    private Payment pendingBalancePayment(Task task) {
        return Payment.builder()
                .id(52L).task(task).customer(customer).transactionUuid(UUID)
                .amount(new BigDecimal("2250.00")).taskTotal(task.getBudget())
                .type(PaymentType.BALANCE)
                .provider(PaymentProvider.ESEWA).status(PaymentStatus.PENDING)
                .build();
    }

    private Payment declaredCashPayment(Task task) {
        return Payment.builder()
                .id(53L).task(task).customer(customer).transactionUuid("SS-CASH-100-1730000000000")
                .amount(new BigDecimal("2250.00")).taskTotal(task.getBudget())
                .type(PaymentType.BALANCE)
                .provider(PaymentProvider.CASH).status(PaymentStatus.PENDING)
                .build();
    }

    private void cashClaimIs(Payment payment) {
        when(paymentRepository.findByTaskIdAndTypeAndProviderAndStatusIn(
                100L, PaymentType.BALANCE, PaymentProvider.CASH,
                List.of(PaymentStatus.PENDING, PaymentStatus.COMPLETED)))
                .thenReturn(payment == null ? List.of() : List.of(payment));
    }

    private void advanceHasSettled() {
        when(paymentRepository.existsByTaskIdAndTypeAndStatus(
                100L, PaymentType.ADVANCE, PaymentStatus.COMPLETED)).thenReturn(true);
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

    @Test
    void initiateAdvance_chargesTenPercentOfTheBudget() {
        Task task = acceptedTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(paymentRepository.findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING)).thenReturn(List.of());
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
        when(paymentRepository.findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING)).thenReturn(List.of());
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
        when(paymentRepository.findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING))
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
        when(paymentRepository.findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING)).thenReturn(List.of());
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
        when(paymentRepository.findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING)).thenReturn(List.of());
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
        when(paymentRepository.findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING)).thenReturn(List.of());
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
        when(paymentRepository.existsByTaskIdAndTypeAndStatus(
                100L, PaymentType.ADVANCE, PaymentStatus.COMPLETED)).thenReturn(true);

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

    @Test
    void initiateBalance_chargesWhatIsLeftAfterTheAdvance() {
        Task task = awaitingPaymentTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        advanceHasSettled();
        when(paymentRepository.findByTaskIdAndTypeAndStatus(
                100L, PaymentType.BALANCE, PaymentStatus.PENDING)).thenReturn(List.of());
        when(esewaService.formatAmount(new BigDecimal("2250.00"))).thenReturn("2250");
        when(esewaService.getFormUrl()).thenReturn("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
        when(esewaService.buildFormFields(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of("total_amount", "2250"));

        PaymentInitiationResponse response =
                paymentService.initiateBalance("customer@example.com", 100L, PaymentProvider.ESEWA);

        // The two legs must add back up to exactly the budget.
        assertThat(response.getAmount()).isEqualByComparingTo("2250.00");
        assertThat(response.getTaskTotal()).isEqualByComparingTo("2500");

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(PaymentType.BALANCE);
        assertThat(captor.getValue().getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void initiateBalance_beforeTheJobIsFinished_isRejected() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() ->
                paymentService.initiateBalance("customer@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("only due once the worker has finished");
    }

    @Test
    void initiateBalance_forCash_isRejectedBecauseThereIsNoGateway() {
        assertThatThrownBy(() ->
                paymentService.initiateBalance("customer@example.com", 100L, PaymentProvider.CASH))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("not made through a gateway");

        // Rejected before anything is even looked up, so no row can be written.
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void initiateBalance_withNoSettledAdvance_isRejected() {
        // Unreachable through the UI, but the balance must never be the first money taken.
        Task task = awaitingPaymentTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() ->
                paymentService.initiateBalance("customer@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("advance on this task has not been paid");
    }

    @Test
    void initiateBalance_whenAlreadyPaidInFull_isRejected() {
        Task task = awaitingPaymentTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        advanceHasSettled();
        when(paymentRepository.existsByTaskIdAndTypeAndStatus(
                100L, PaymentType.BALANCE, PaymentStatus.COMPLETED)).thenReturn(true);

        assertThatThrownBy(() ->
                paymentService.initiateBalance("customer@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("already been paid in full");
    }

    @Test
    void initiateBalance_supersedesOnlyItsOwnAbandonedAttempts() {
        Task task = awaitingPaymentTask();
        Payment abandoned = pendingBalancePayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        advanceHasSettled();
        when(paymentRepository.findByTaskIdAndTypeAndStatus(
                100L, PaymentType.BALANCE, PaymentStatus.PENDING)).thenReturn(List.of(abandoned));
        when(esewaService.formatAmount(any())).thenReturn("2250");
        when(esewaService.buildFormFields(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of());

        paymentService.initiateBalance("customer@example.com", 100L, PaymentProvider.ESEWA);

        assertThat(abandoned.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        // The advance's own rows are a different leg and must be left alone.
        verify(paymentRepository, never())
                .findByTaskIdAndTypeAndStatus(100L, PaymentType.ADVANCE, PaymentStatus.PENDING);
    }

    @Test
    void initiateBalance_onSomeoneElsesTask_isTreatedAsNotFound() {
        Task task = awaitingPaymentTask();
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() ->
                paymentService.initiateBalance("other@example.com", 100L, PaymentProvider.ESEWA))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void completeEsewa_forTheBalance_closesTheJobOutAndTellsTheWorker() {
        // A gateway verifies itself, so there is nothing for the worker to confirm - the
        // job closes the moment eSewa says the money moved.
        Task task = awaitingPaymentTask();
        Payment payment = pendingBalancePayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(esewaService.decodeCallback("data")).thenReturn(callback("COMPLETE", "2250"));
        when(paymentRepository.findByTransactionUuid(UUID)).thenReturn(Optional.of(payment));
        when(esewaService.formatAmount(any())).thenReturn("2250");
        when(esewaService.checkStatus(UUID, "2250"))
                .thenReturn(new EsewaStatusResponse("EPAYTEST", UUID, "2250", "COMPLETE", "0001TS9"));

        PaymentResponse response = paymentService.completeEsewa("customer@example.com", "data");

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(response.getType()).isEqualTo(PaymentType.BALANCE);
        verify(taskService).markPaidInFull(task);
        verify(notificationService).notify(
                org.mockito.ArgumentMatchers.eq(worker),
                anyString(), anyString(), anyString(),
                org.mockito.ArgumentMatchers.eq("/worker/earnings"));
    }

    @Test
    void declareCashBalance_recordsAClaimNobodyHasConfirmedYet() {
        Task task = awaitingPaymentTask();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        advanceHasSettled();
        when(paymentRepository.findByTaskIdAndTypeAndStatus(
                100L, PaymentType.BALANCE, PaymentStatus.PENDING)).thenReturn(List.of());

        PaymentResponse response = paymentService.declareCashBalance("customer@example.com", 100L);

        assertThat(response.getProvider()).isEqualTo(PaymentProvider.CASH);
        assertThat(response.getType()).isEqualTo(PaymentType.BALANCE);
        // PENDING, not COMPLETED: the customer's word alone does not settle anything.
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.getAmount()).isEqualByComparingTo("2250.00");
        // And the task must not move - that is the worker's call.
        assertThat(task.getStatus()).isEqualTo(TaskStatus.AWAITING_PAYMENT);
        verify(taskService, never()).markPaidInFull(any());

        // The worker has to be told, or nothing will ever prompt them to answer.
        verify(notificationService).notify(
                org.mockito.ArgumentMatchers.eq(worker),
                org.mockito.ArgumentMatchers.eq("CASH_DECLARED"),
                anyString(), anyString(),
                org.mockito.ArgumentMatchers.eq("/worker/earnings"));
    }

    @Test
    void declareCashBalance_supersedesAnAbandonedGatewayAttempt() {
        // Changing your mind at the gateway and paying cash instead must not leave two
        // live rows on the same leg.
        Task task = awaitingPaymentTask();
        Payment abandoned = pendingBalancePayment(task);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        advanceHasSettled();
        when(paymentRepository.findByTaskIdAndTypeAndStatus(
                100L, PaymentType.BALANCE, PaymentStatus.PENDING)).thenReturn(List.of(abandoned));

        paymentService.declareCashBalance("customer@example.com", 100L);

        assertThat(abandoned.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
    }

    @Test
    void declareCashBalance_beforeTheJobIsFinished_isRejected() {
        Task task = acceptedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> paymentService.declareCashBalance("customer@example.com", 100L))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("only due once the worker has finished");
    }

    @Test
    void declareCashBalance_onSomeoneElsesTask_isTreatedAsNotFound() {
        Task task = awaitingPaymentTask();
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> paymentService.declareCashBalance("other@example.com", 100L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void confirmCashReceipt_settlesThePaymentAndClosesTheJob() {
        Task task = awaitingPaymentTask();
        Payment claim = declaredCashPayment(task);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        cashClaimIs(claim);

        PaymentResponse response = paymentService.confirmCashReceipt("worker@example.com", 100L);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        verify(taskService).markPaidInFull(task);
        // The customer gets a receipt; the worker does not get told what they just said.
        verify(notificationService).notify(
                org.mockito.ArgumentMatchers.eq(customer),
                anyString(), anyString(), anyString(), anyString());
        verify(notificationService, never()).notify(
                org.mockito.ArgumentMatchers.eq(worker),
                anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void confirmCashReceipt_isIdempotentSoADoublePressIsHarmless() {
        Task task = awaitingPaymentTask();
        Payment claim = declaredCashPayment(task);
        claim.setStatus(PaymentStatus.COMPLETED);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        cashClaimIs(claim);

        PaymentResponse response = paymentService.confirmCashReceipt("worker@example.com", 100L);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        verify(taskService, never()).markPaidInFull(any());
    }

    @Test
    void rejectCashReceipt_failsTheClaimButLeavesTheTaskPayable() {
        Task task = awaitingPaymentTask();
        Payment claim = declaredCashPayment(task);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        cashClaimIs(claim);

        PaymentResponse response = paymentService.rejectCashReceipt("worker@example.com", 100L);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
        // The job must not be stranded - the customer has to be able to pay again.
        assertThat(task.getStatus()).isEqualTo(TaskStatus.AWAITING_PAYMENT);
        verify(taskService, never()).markPaidInFull(any());
        verify(notificationService).notify(
                org.mockito.ArgumentMatchers.eq(customer),
                org.mockito.ArgumentMatchers.eq("CASH_REJECTED"),
                anyString(), anyString(),
                org.mockito.ArgumentMatchers.eq("/dashboard/checkout/100"));
    }

    @Test
    void confirmCashReceipt_byAWorkerTheTaskIsNotAssignedTo_isTreatedAsNotFound() {
        Task task = awaitingPaymentTask();
        User otherWorker = User.builder()
                .id(4L).email("intruder@example.com").fullName("Worker Two")
                .phone("9800000004").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        when(userRepository.findByEmail("intruder@example.com")).thenReturn(Optional.of(otherWorker));
        cashClaimIs(declaredCashPayment(task));

        assertThatThrownBy(() -> paymentService.confirmCashReceipt("intruder@example.com", 100L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(taskService, never()).markPaidInFull(any());
    }

    @Test
    void confirmCashReceipt_withNoClaimToAnswer_isTreatedAsNotFound() {
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        cashClaimIs(null);

        assertThatThrownBy(() -> paymentService.confirmCashReceipt("worker@example.com", 100L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

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

    @Test
    void theTwoLegsAlwaysAddUpToTheBudget() {
        // The point of subtracting rather than taking 90% directly: a customer must never be
        // charged a rupee more or less than the budget across the two instalments.
        for (String budget : List.of("2500", "1999", "1234.56", "0.05", "99999.99")) {
            BigDecimal total = new BigDecimal(budget);
            assertThat(paymentService.advanceFor(total).add(paymentService.balanceFor(total)))
                    .as("legs of %s", budget)
                    .isEqualByComparingTo(total);
        }
    }
}
