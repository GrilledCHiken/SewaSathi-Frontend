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

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final List<TaskStatus> ACTIVE_STATUSES =
            List.of(TaskStatus.OPEN, TaskStatus.REQUESTED, TaskStatus.ACCEPTED,
                    TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS);

    private static final Set<String> ALLOWED_TIME_PREFERENCES =
            Set.of("Flexible", "Morning", "Afternoon", "Evening");

    private static final int MAX_DUE_DATE_YEARS = 1;

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final NotificationService notificationService;

    /**
     * The checks bean validation cannot express: a value list, and a comparison between two
     * fields. Messages carry a {@code "<field>: "} prefix so they match the shape
     * {@link com.sewasathi.exception.GlobalExceptionHandler} gives constraint violations, which
     * is what lets the form pin them under the input that caused them.
     */
    private void validateCreateRequest(CreateTaskRequest request) {
        if (!ServiceCategories.ALLOWED.contains(request.getCategory().trim())) {
            throw new InvalidOperationException("category: Please select a category from the list.");
        }

        String timePreference = request.getTimePreference();
        if (timePreference != null && !ALLOWED_TIME_PREFERENCES.contains(timePreference.trim())) {
            throw new InvalidOperationException("timePreference: Please choose a valid time preference.");
        }

        if (request.getHourlyRate() != null
                && request.getHourlyRate().compareTo(request.getBudget()) > 0) {
            throw new InvalidOperationException("hourlyRate: Hourly rate cannot be more than the total budget.");
        }

        // @FutureOrPresent already covers the past; this is the other end of the range.
        LocalDate dueDate = request.getDueDate();
        if (dueDate != null && dueDate.isAfter(LocalDate.now().plusYears(MAX_DUE_DATE_YEARS))) {
            throw new InvalidOperationException("dueDate: Due date cannot be more than 1 year ahead.");
        }
    }

    @Transactional
    public TaskResponse createTask(String customerEmail, CreateTaskRequest request) {
        validateCreateRequest(request);
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

        // A direct hire is a request, not a booking - the worker still has to say yes. The
        // task leaves OPEN so nobody else can claim it while they decide, and declining
        // puts it straight back.
        task.setAssignedWorker(worker);
        task.setStatus(TaskStatus.REQUESTED);
        Task saved = taskRepository.save(task);

        notificationService.notify(worker, "TASK_REQUESTED",
                "You have a new job request",
                customer.getFullName() + " asked you to take on \"" + task.getTitle()
                        + "\". Accept or reject it from My Jobs.",
                "/worker/jobs");

        return TaskResponse.from(saved);
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

    /**
     * Two doors into the same state: a worker claiming an unclaimed task off the open feed,
     * or answering yes to a direct request a customer addressed to them.
     */
    @Transactional
    public TaskResponse acceptTask(Long taskId, String workerEmail) {
        User worker = getApprovedWorkerOrThrow(workerEmail);
        Task task = getTaskOrThrow(taskId);

        if (task.getStatus() == TaskStatus.REQUESTED) {
            return TaskResponse.from(acceptRequest(task, worker));
        }
        if (task.getStatus() != TaskStatus.OPEN) {
            throw new InvalidOperationException("This task is no longer open");
        }
        task.setAssignedWorker(worker);
        // Stays ACCEPTED until the customer pays the advance; PaymentService moves it to ASSIGNED.
        task.setStatus(TaskStatus.ACCEPTED);
        return TaskResponse.from(taskRepository.save(task));
    }

    /** The yes half of a direct hire. Only the worker who was asked can answer. */
    private Task acceptRequest(Task task, User worker) {
        ensureAssignedTo(task, worker);
        task.setStatus(TaskStatus.ACCEPTED);
        Task saved = taskRepository.save(task);

        notificationService.notify(task.getCustomer(), "TASK_ACCEPTED",
                worker.getFullName() + " accepted your request",
                "Pay the advance on \"" + task.getTitle() + "\" to confirm the booking.",
                "/dashboard/tasks");

        return saved;
    }

    /**
     * The no half. The task returns to the open pool rather than being cancelled, so it
     * reappears in the public feed and the customer can pick someone else without reposting.
     */
    @Transactional
    public TaskResponse declineRequest(Long taskId, String workerEmail) {
        User worker = getApprovedWorkerOrThrow(workerEmail);
        Task task = getTaskOrThrow(taskId);
        ensureAssignedTo(task, worker);
        if (task.getStatus() != TaskStatus.REQUESTED) {
            throw new InvalidOperationException("This request can no longer be declined");
        }

        task.setAssignedWorker(null);
        task.setStatus(TaskStatus.OPEN);
        Task saved = taskRepository.save(task);

        notificationService.notify(task.getCustomer(), "TASK_DECLINED",
                worker.getFullName() + " declined your request",
                "\"" + task.getTitle() + "\" is open again - hire another worker or wait for "
                        + "one to accept it.",
                "/dashboard/tasks");

        return TaskResponse.from(saved);
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
        ensureAssignedTo(task, worker);
        return task;
    }

    /** Another worker's task is indistinguishable from one that does not exist. */
    private void ensureAssignedTo(Task task, User worker) {
        if (task.getAssignedWorker() == null || !task.getAssignedWorker().getId().equals(worker.getId())) {
            throw new ResourceNotFoundException("No task with id " + task.getId());
        }
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
