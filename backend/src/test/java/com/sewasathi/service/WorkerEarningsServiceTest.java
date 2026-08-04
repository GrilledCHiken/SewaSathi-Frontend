package com.sewasathi.service;

import com.sewasathi.dto.response.WorkerEarningsResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.PaymentType;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkerEarningsServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    private WorkerEarningsService earningsService;

    private User customer;
    private User worker;

    @BeforeEach
    void setUp() {
        PaymentService paymentService = new PaymentService(
                paymentRepository, taskRepository, userRepository, null, null, null, null,
                new BigDecimal("0.10"), "http://localhost:5174");
        earningsService = new WorkerEarningsService(
                taskRepository, paymentRepository, userRepository, paymentService);

        customer = User.builder()
                .id(1L).email("customer@example.com").fullName("Customer One")
                .role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        worker = User.builder()
                .id(3L).email("worker@example.com").fullName("Worker One")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
    }

    /** A job that is finished, settled and closed. */
    private Task completedTask(long id, String budget) {
        return finishedTask(id, budget, TaskStatus.COMPLETED);
    }

    /** A job whose work is done but whose balance has not been collected. */
    private Task unsettledTask(long id, String budget) {
        return finishedTask(id, budget, TaskStatus.AWAITING_PAYMENT);
    }

    private Task finishedTask(long id, String budget, TaskStatus status) {
        return Task.builder()
                .id(id).customer(customer).assignedWorker(worker)
                .title("Deep clean " + id).category("Cleaning").description("desc")
                .city("Kathmandu").location("Baneshwor")
                .budget(new BigDecimal(budget)).status(status)
                .build();
    }

    private Payment settled(Task task, PaymentType type, String amount) {
        return Payment.builder()
                .id(task.getId() * 10 + type.ordinal())
                .task(task).customer(customer)
                .transactionUuid("SS-" + task.getId() + "-" + type)
                .amount(new BigDecimal(amount)).taskTotal(task.getBudget())
                .type(type).provider(PaymentProvider.ESEWA).status(PaymentStatus.COMPLETED)
                .build();
    }

    private Payment declaredCash(Task task, String amount) {
        return Payment.builder()
                .id(task.getId() * 10 + 9)
                .task(task).customer(customer)
                .transactionUuid("SS-CASH-" + task.getId())
                .amount(new BigDecimal(amount)).taskTotal(task.getBudget())
                .type(PaymentType.BALANCE).provider(PaymentProvider.CASH)
                .status(PaymentStatus.PENDING)
                .build();
    }

    private void workerExists() {
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
    }

    private void finishedJobsAre(Task... tasks) {
        when(taskRepository.findByAssignedWorkerIdAndStatusInOrderByCreatedAtDesc(
                3L, List.of(TaskStatus.AWAITING_PAYMENT, TaskStatus.COMPLETED)))
                .thenReturn(List.of(tasks));
    }

    @Test
    void withNoFinishedJobs_everythingIsZeroAndNoPaymentsAreRead() {
        workerExists();
        finishedJobsAre();

        WorkerEarningsResponse earnings = earningsService.getMyEarnings("worker@example.com");

        assertThat(earnings.getLifetimeEarned()).isEqualByComparingTo("0");
        assertThat(earnings.getOutstanding()).isEqualByComparingTo("0");
        assertThat(earnings.getJobsCompleted()).isZero();
        assertThat(earnings.getJobs()).isEmpty();
        // An empty `in ()` query is not portable, so it must be short-circuited entirely.
        verify(paymentRepository, never()).findByTaskIdInAndStatus(any(), any());
    }

    @Test
    void whenOnlyTheAdvanceHasCleared_theBalanceIsOutstanding() {
        // The job this figure exists for: the work is done and unpaid, so it has to be
        // visible even though the task is not COMPLETED.
        Task task = unsettledTask(100L, "2500");
        workerExists();
        finishedJobsAre(task);
        when(paymentRepository.findByTaskIdInAndStatus(List.of(100L), PaymentStatus.COMPLETED))
                .thenReturn(List.of(settled(task, PaymentType.ADVANCE, "250.00")));

        WorkerEarningsResponse earnings = earningsService.getMyEarnings("worker@example.com");

        // The job is worth its whole budget the moment it is finished; only 10% has landed.
        assertThat(earnings.getLifetimeEarned()).isEqualByComparingTo("2500.00");
        assertThat(earnings.getReceived()).isEqualByComparingTo("250.00");
        assertThat(earnings.getOutstanding()).isEqualByComparingTo("2250.00");
        assertThat(earnings.getAdvanceReceived()).isEqualByComparingTo("250.00");
        assertThat(earnings.getBalanceReceived()).isEqualByComparingTo("0");
        assertThat(earnings.getJobsAwaitingBalance()).isEqualTo(1);
        // Earned, but not closed out - that only happens once the money is in.
        assertThat(earnings.getJobsCompleted()).isZero();

        assertThat(earnings.getJobs()).singleElement().satisfies(row -> {
            assertThat(row.isAdvancePaid()).isTrue();
            assertThat(row.isBalancePaid()).isFalse();
            assertThat(row.isSettled()).isFalse();
            assertThat(row.isCashDeclared()).isFalse();
            assertThat(row.getAdvanceAmount()).isEqualByComparingTo("250.00");
            assertThat(row.getBalanceAmount()).isEqualByComparingTo("2250.00");
            assertThat(row.getBalanceProvider()).isNull();
        });
    }

    @Test
    void aDeclaredCashPaymentIsFlaggedForTheWorkerToAnswer() {
        Task task = unsettledTask(100L, "2500");
        workerExists();
        finishedJobsAre(task);
        when(paymentRepository.findByTaskIdInAndStatus(List.of(100L), PaymentStatus.COMPLETED))
                .thenReturn(List.of(settled(task, PaymentType.ADVANCE, "250.00")));
        when(paymentRepository.findByTaskIdInAndTypeAndProviderAndStatus(
                List.of(100L), PaymentType.BALANCE, PaymentProvider.CASH, PaymentStatus.PENDING))
                .thenReturn(List.of(declaredCash(task, "2250.00")));

        WorkerEarningsResponse earnings = earningsService.getMyEarnings("worker@example.com");

        assertThat(earnings.getJobsAwaitingCashConfirmation()).isEqualTo(1);
        // Still outstanding: a claim is not money, and the totals must not pretend it is.
        assertThat(earnings.getOutstanding()).isEqualByComparingTo("2250.00");
        assertThat(earnings.getJobs()).singleElement().satisfies(row -> {
            assertThat(row.isCashDeclared()).isTrue();
            assertThat(row.isBalancePaid()).isFalse();
        });
    }

    @Test
    void onceTheBalanceClears_nothingIsOutstanding() {
        Task task = completedTask(100L, "2500");
        workerExists();
        finishedJobsAre(task);
        when(paymentRepository.findByTaskIdInAndStatus(List.of(100L), PaymentStatus.COMPLETED))
                .thenReturn(List.of(
                        settled(task, PaymentType.ADVANCE, "250.00"),
                        settled(task, PaymentType.BALANCE, "2250.00")));

        WorkerEarningsResponse earnings = earningsService.getMyEarnings("worker@example.com");

        assertThat(earnings.getLifetimeEarned()).isEqualByComparingTo("2500.00");
        assertThat(earnings.getReceived()).isEqualByComparingTo("2500.00");
        assertThat(earnings.getOutstanding()).isEqualByComparingTo("0");
        assertThat(earnings.getBalanceReceived()).isEqualByComparingTo("2250.00");
        assertThat(earnings.getJobsAwaitingBalance()).isZero();
        assertThat(earnings.getJobsCompleted()).isEqualTo(1);
        assertThat(earnings.getJobs()).singleElement().satisfies(row -> {
            assertThat(row.isBalancePaid()).isTrue();
            assertThat(row.isSettled()).isTrue();
            assertThat(row.getBalanceProvider()).isEqualTo(PaymentProvider.ESEWA);
        });
    }

    @Test
    void acrossSeveralJobs_theTotalsAreSummedInOneQuery() {
        Task paid = completedTask(100L, "2500");
        Task halfPaid = unsettledTask(101L, "1000");
        workerExists();
        finishedJobsAre(paid, halfPaid);
        when(paymentRepository.findByTaskIdInAndStatus(List.of(100L, 101L), PaymentStatus.COMPLETED))
                .thenReturn(List.of(
                        settled(paid, PaymentType.ADVANCE, "250.00"),
                        settled(paid, PaymentType.BALANCE, "2250.00"),
                        settled(halfPaid, PaymentType.ADVANCE, "100.00")));

        WorkerEarningsResponse earnings = earningsService.getMyEarnings("worker@example.com");

        assertThat(earnings.getLifetimeEarned()).isEqualByComparingTo("3500.00");
        assertThat(earnings.getReceived()).isEqualByComparingTo("2600.00");
        assertThat(earnings.getOutstanding()).isEqualByComparingTo("900.00");
        // Both are earned; only the settled one is counted as completed.
        assertThat(earnings.getJobs()).hasSize(2);
        assertThat(earnings.getJobsCompleted()).isEqualTo(1);
        assertThat(earnings.getJobsAwaitingBalance()).isEqualTo(1);
        // One round-trip for the whole list, not one per job.
        verify(paymentRepository).findByTaskIdInAndStatus(any(), eq(PaymentStatus.COMPLETED));
    }
}
