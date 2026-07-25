package com.sewasathi.service;

import com.sewasathi.dto.request.CreateTaskRequest;
import com.sewasathi.dto.response.DashboardSummaryResponse;
import com.sewasathi.dto.response.TaskResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final List<TaskStatus> ACTIVE_STATUSES =
            List.of(TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS);

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;

    @Transactional
    public TaskResponse createTask(String customerEmail, CreateTaskRequest request) {
        User customer = getUser(customerEmail);
        Task task = Task.builder()
                .customer(customer)
                .title(request.getTitle().trim())
                .category(request.getCategory().trim())
                .description(request.getDescription().trim())
                .city(request.getCity().trim())
                .location(request.getLocation().trim())
                .budget(request.getBudget())
                .hourlyRate(request.getHourlyRate())
                .dueDate(request.getDueDate())
                .timePreference(request.getTimePreference())
                .status(TaskStatus.OPEN)
                .build();
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listMyTasks(String customerEmail, TaskStatus statusFilter) {
        User customer = getUser(customerEmail);
        List<Task> tasks = statusFilter == null
                ? taskRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                : taskRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customer.getId(), statusFilter);
        return tasks.stream().map(TaskResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(Long taskId, String requesterEmail) {
        User requester = getUser(requesterEmail);
        Task task = getTaskOrThrow(taskId);
        ensureCanView(task, requester);
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse cancelTask(Long taskId, String customerEmail) {
        User customer = getUser(customerEmail);
        Task task = getTaskOrThrow(taskId);
        if (!task.getCustomer().getId().equals(customer.getId())) {
            throw new ResourceNotFoundException("No task with id " + taskId);
        }
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.CANCELLED) {
            throw new InvalidOperationException("This task can no longer be cancelled");
        }
        task.setStatus(TaskStatus.CANCELLED);
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse assignWorker(Long taskId, String customerEmail, Long workerId) {
        User customer = getUser(customerEmail);
        Task task = getTaskOrThrow(taskId);
        if (!task.getCustomer().getId().equals(customer.getId())) {
            throw new ResourceNotFoundException("No task with id " + taskId);
        }
        if (task.getStatus() != TaskStatus.OPEN) {
            throw new InvalidOperationException("This task is no longer open");
        }

        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("No worker with id " + workerId));
        if (worker.getRole() != Role.WORKER) {
            throw new InvalidOperationException("Selected user is not a worker");
        }
        if (worker.getStatus() != ApprovalStatus.APPROVED || worker.isSuspended()) {
            throw new InvalidOperationException("This worker is not currently available");
        }

        task.setAssignedWorker(worker);
        task.setStatus(TaskStatus.ASSIGNED);
        return TaskResponse.from(taskRepository.save(task));
    }

    public DashboardSummaryResponse getDashboardSummary(String customerEmail) {
        User customer = getUser(customerEmail);
        long active = taskRepository.countByCustomerIdAndStatusIn(customer.getId(), ACTIVE_STATUSES);
        long completed = taskRepository.countByCustomerIdAndStatus(customer.getId(), TaskStatus.COMPLETED);
        return new DashboardSummaryResponse(active, completed);
    }

    // --- Worker-side ---

    @Transactional(readOnly = true)
    public List<TaskResponse> listOpenTasks() {
        return taskRepository.findByStatusOrderByCreatedAtDesc(TaskStatus.OPEN).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listMyJobs(String workerEmail, TaskStatus statusFilter) {
        User worker = getUser(workerEmail);
        List<Task> tasks = statusFilter == null
                ? taskRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(worker.getId())
                : taskRepository.findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(worker.getId(), statusFilter);
        return tasks.stream().map(TaskResponse::from).toList();
    }

    @Transactional
    public TaskResponse acceptTask(Long taskId, String workerEmail) {
        User worker = getApprovedWorkerOrThrow(workerEmail);
        Task task = getTaskOrThrow(taskId);
        if (task.getStatus() != TaskStatus.OPEN) {
            throw new InvalidOperationException("This task is no longer open");
        }
        task.setAssignedWorker(worker);
        task.setStatus(TaskStatus.ASSIGNED);
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse startTask(Long taskId, String workerEmail) {
        User worker = getApprovedWorkerOrThrow(workerEmail);
        Task task = getOwnJobOrThrow(taskId, worker);
        if (task.getStatus() != TaskStatus.ASSIGNED) {
            throw new InvalidOperationException("This task is not ready to be started");
        }
        task.setStatus(TaskStatus.IN_PROGRESS);
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse completeTask(Long taskId, String workerEmail) {
        User worker = getApprovedWorkerOrThrow(workerEmail);
        Task task = getOwnJobOrThrow(taskId, worker);
        if (task.getStatus() != TaskStatus.IN_PROGRESS) {
            throw new InvalidOperationException("This task is not in progress");
        }
        task.setStatus(TaskStatus.COMPLETED);
        Task saved = taskRepository.save(task);

        workerProfileRepository.findByUserId(worker.getId()).ifPresent(profile -> {
            profile.setTasksCompleted(profile.getTasksCompleted() + 1);
            workerProfileRepository.save(profile);
        });

        return TaskResponse.from(saved);
    }

    // --- helpers ---

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }

    private User getApprovedWorkerOrThrow(String email) {
        User user = getUser(email);
        if (user.getStatus() != ApprovalStatus.APPROVED) {
            throw new InvalidOperationException("Your worker account is not yet approved");
        }
        return user;
    }

    private Task getTaskOrThrow(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("No task with id " + taskId));
    }

    private Task getOwnJobOrThrow(Long taskId, User worker) {
        Task task = getTaskOrThrow(taskId);
        if (task.getAssignedWorker() == null || !task.getAssignedWorker().getId().equals(worker.getId())) {
            throw new ResourceNotFoundException("No task with id " + taskId);
        }
        return task;
    }

    private void ensureCanView(Task task, User requester) {
        boolean isCustomer = task.getCustomer().getId().equals(requester.getId());
        boolean isAssignedWorker = task.getAssignedWorker() != null
                && task.getAssignedWorker().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole() == Role.ADMIN;
        if (!isCustomer && !isAssignedWorker && !isAdmin) {
            throw new ResourceNotFoundException("No task with id " + task.getId());
        }
    }
}
