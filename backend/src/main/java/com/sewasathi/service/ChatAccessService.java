package com.sewasathi.service;

import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.Task;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Decides whether a customer and a worker are allowed to chat at all.
 *
 * <p>Hiring someone is not enough: the thread stays shut until the customer's advance has
 * settled on one of the tasks they share. Both the REST path ({@link MessageService}) and
 * the socket path ({@link com.sewasathi.websocket.StompAuthChannelInterceptor}) enforce
 * this separately, so the rule lives here rather than being written out twice.
 */
@Service
@RequiredArgsConstructor
public class ChatAccessService {

    private final TaskRepository taskRepository;
    private final PaymentRepository paymentRepository;

    /**
     * The tasks behind a conversation, oldest first. Empty when the pair share no task
     * with the worker assigned, and empty just the same while the advance is unpaid -
     * callers cannot tell the two apart, which is what keeps an unpaid thread invisible
     * rather than merely read-only.
     */
    @Transactional(readOnly = true)
    public List<Task> unlockedSharedTasks(ConversationKey key) {
        if (key == null) {
            return List.of();
        }
        List<Task> sharedTasks = taskRepository
                .findByCustomerIdAndAssignedWorkerIdOrderByCreatedAtAsc(key.customerId(), key.workerId());
        if (sharedTasks.isEmpty()) {
            return List.of();
        }
        boolean anyPaid = !paidTaskIds(sharedTasks.stream().map(Task::getId).toList()).isEmpty();
        // One settled advance opens the whole thread: the chat belongs to the pair, not
        // to a single job, and it stays open even if that job is later cancelled.
        return anyPaid ? sharedTasks : List.of();
    }

    /**
     * Which of these tasks the customer has already paid the advance on. The empty case
     * short-circuits rather than issuing an {@code in ()} query, which is not portable.
     */
    @Transactional(readOnly = true)
    public Set<Long> paidTaskIds(Collection<Long> taskIds) {
        if (taskIds == null || taskIds.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(
                paymentRepository.findTaskIdsByTaskIdInAndStatus(taskIds, PaymentStatus.COMPLETED));
    }
}
