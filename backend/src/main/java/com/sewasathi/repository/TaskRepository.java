package com.sewasathi.repository;

import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Task> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, TaskStatus status);
    List<Task> findByCustomerIdAndAssignedWorkerIsNotNullOrderByUpdatedAtDesc(Long customerId);

    List<Task> findByAssignedWorkerIdOrderByCreatedAtDesc(Long workerId);
    List<Task> findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(Long workerId, TaskStatus status);

    List<Task> findByStatusOrderByCreatedAtDesc(TaskStatus status);

    long countByCustomerIdAndStatusIn(Long customerId, List<TaskStatus> statuses);
    long countByCustomerIdAndStatus(Long customerId, TaskStatus status);
}
