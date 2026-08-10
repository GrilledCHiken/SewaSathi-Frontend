package com.sewasathi.service;

import com.sewasathi.dto.response.WorkerEarningRow;
import com.sewasathi.dto.response.WorkerEarningsResponse;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.PaymentType;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * What a worker has earned, read from finished tasks rather than a running total, so there is
 * no balance to drift out of step. "Finished" spans both {@link TaskStatus#AWAITING_PAYMENT}
 * and {@link TaskStatus#COMPLETED} - the unsettled ones are what the outstanding figure is for.
 * Served under {@code /api/worker/**}, not {@code /api/payments/**}, and returns only the legs
 * of tasks assigned to the caller.
 */
@Service
@RequiredArgsConstructor
public class WorkerEarningsService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    /** Jobs whose work is done, settled or not. */
    private static final List<TaskStatus> FINISHED_STATUSES =
            List.of(TaskStatus.AWAITING_PAYMENT, TaskStatus.COMPLETED);

    private final TaskRepository taskRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;

    @Transactional(readOnly = true)
    public WorkerEarningsResponse getMyEarnings(String workerEmail) {
        User worker = userRepository.findByEmail(workerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + workerEmail));

        List<Task> finished = taskRepository.findByAssignedWorkerIdAndStatusInOrderByCreatedAtDesc(
                worker.getId(), FINISHED_STATUSES);
        if (finished.isEmpty()) {
            return new WorkerEarningsResponse(ZERO, ZERO, ZERO, ZERO, ZERO, 0, 0, 0, List.of());
        }

        List<Long> taskIds = finished.stream().map(Task::getId).toList();
        Map<Long, Map<PaymentType, Payment>> settledByTask = settledLegs(taskIds);
        Map<Long, Payment> cashClaims = declaredCashByTask(taskIds);

        List<WorkerEarningRow> rows = new ArrayList<>(finished.size());
        BigDecimal lifetime = ZERO;
        BigDecimal advanceReceived = ZERO;
        BigDecimal balanceReceived = ZERO;
        long completedJobs = 0;
        long awaitingBalance = 0;
        long awaitingCashConfirmation = 0;

        for (Task task : finished) {
            Map<PaymentType, Payment> legs =
                    settledByTask.getOrDefault(task.getId(), Map.of());
            Payment advance = legs.get(PaymentType.ADVANCE);
            Payment balance = legs.get(PaymentType.BALANCE);
            boolean cashDeclared = balance == null && cashClaims.containsKey(task.getId());

            // Computed from the budget, not read off the payment: an unpaid leg has no
            // payment row, and that is the case the outstanding figure exists for.
            BigDecimal advanceAmount = paymentService.advanceFor(task.getBudget());
            BigDecimal balanceAmount = paymentService.balanceFor(task.getBudget());

            lifetime = lifetime.add(task.getBudget());
            if (task.getStatus() == TaskStatus.COMPLETED) {
                completedJobs++;
            }
            if (advance != null) {
                advanceReceived = advanceReceived.add(advance.getAmount());
            }
            if (balance != null) {
                balanceReceived = balanceReceived.add(balance.getAmount());
            } else {
                awaitingBalance++;
            }
            if (cashDeclared) {
                awaitingCashConfirmation++;
            }

            rows.add(new WorkerEarningRow(
                    task.getId(),
                    task.getTitle(),
                    task.getCategory(),
                    task.getCustomer().getFullName(),
                    task.getUpdatedAt(),
                    task.getBudget(),
                    advanceAmount,
                    balanceAmount,
                    advance != null,
                    balance != null,
                    balance != null ? balance.getProvider() : null,
                    balance != null ? balance.getUpdatedAt() : null,
                    cashDeclared,
                    task.getStatus() == TaskStatus.COMPLETED
            ));
        }

        BigDecimal received = advanceReceived.add(balanceReceived);
        return new WorkerEarningsResponse(
                scaled(lifetime),
                scaled(received),
                // Never negative: an advance that settled before the budget was edited down
                // would otherwise show the worker owing money back.
                scaled(lifetime.subtract(received).max(BigDecimal.ZERO)),
                scaled(advanceReceived),
                scaled(balanceReceived),
                completedJobs,
                awaitingBalance,
                awaitingCashConfirmation,
                rows
        );
    }

    /**
     * The settled legs of these tasks, keyed by task then by type. One query for the whole
     * list; a per-task lookup would cost a round-trip per completed job.
     */
    private Map<Long, Map<PaymentType, Payment>> settledLegs(List<Long> taskIds) {
        Map<Long, Map<PaymentType, Payment>> byTask = new HashMap<>();
        for (Payment payment : paymentRepository.findByTaskIdInAndStatus(taskIds, PaymentStatus.COMPLETED)) {
            byTask.computeIfAbsent(payment.getTask().getId(), id -> new EnumMap<>(PaymentType.class))
                    .put(payment.getType(), payment);
        }
        return byTask;
    }

    /**
     * Cash the customer says they handed over but nobody has confirmed yet, keyed by task.
     * One query for the whole list, same as {@link #settledLegs}. At most one such claim can
     * be open per task - declaring cash cancels whatever was pending on that leg before it.
     */
    private Map<Long, Payment> declaredCashByTask(List<Long> taskIds) {
        Map<Long, Payment> byTask = new HashMap<>();
        for (Payment payment : paymentRepository.findByTaskIdInAndTypeAndProviderAndStatus(
                taskIds, PaymentType.BALANCE, PaymentProvider.CASH, PaymentStatus.PENDING)) {
            byTask.put(payment.getTask().getId(), payment);
        }
        return byTask;
    }

    private static BigDecimal scaled(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
