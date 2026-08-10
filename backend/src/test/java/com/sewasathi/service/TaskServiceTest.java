package com.sewasathi.service;

import com.sewasathi.dto.request.CreateTaskRequest;
import com.sewasathi.dto.response.TaskResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.EmailDeliveryException;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkerProfileRepository workerProfileRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    private TaskService taskService;

    private User customer;
    private User otherCustomer;
    private User approvedWorker;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(
                taskRepository, userRepository, workerProfileRepository, notificationService,
                emailService, "http://localhost:5173", new BigDecimal("0.10"));

        customer = User.builder()
                .id(1L).email("customer@example.com").fullName("Customer One")
                .phone("9800000001").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        otherCustomer = User.builder()
                .id(2L).email("other@example.com").fullName("Customer Two")
                .phone("9800000002").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        approvedWorker = User.builder()
                .id(3L).email("worker@example.com").fullName("Worker One")
                .phone("9800000003").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();

        lenient().when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Task openTaskOwnedBy(User owner) {
        return Task.builder()
                .id(100L).customer(owner).title("Test task").category("Cleaning")
                .description("desc").city("Kathmandu").location("Baneshwor")
                .budget(new BigDecimal("1000")).status(TaskStatus.OPEN)
                .build();
    }

    /** A task the customer has hired {@link #approvedWorker} for, awaiting their answer. */
    private Task requestedTask() {
        Task task = openTaskOwnedBy(customer);
        task.setStatus(TaskStatus.REQUESTED);
        task.setAssignedWorker(approvedWorker);
        return task;
    }

    private CreateTaskRequest validCreateRequest() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Clean my house");
        request.setCategory("Cleaning");
        request.setDescription("Full house cleaning");
        request.setCity("Kathmandu");
        request.setLocation("Baneshwor");
        request.setBudget(new BigDecimal("1500"));
        return request;
    }

    @Test
    void createTask_defaultsToOpenStatus() {
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));

        TaskResponse response = taskService.createTask("customer@example.com", validCreateRequest());

        assertThat(response.getStatus()).isEqualTo(TaskStatus.OPEN);
        assertThat(response.getCustomer().getId()).isEqualTo(customer.getId());
    }

    // The checks below are the ones bean validation cannot express, so they live in the service
    // and are the only part of the create path a DTO-level test would miss.

    @Test
    void createTask_rejectsACategoryOutsideTheList() {
        CreateTaskRequest request = validCreateRequest();
        request.setCategory("Bomb Disposal");

        assertThatThrownBy(() -> taskService.createTask("customer@example.com", request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("category:");
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void createTask_rejectsATimePreferenceOutsideTheList() {
        CreateTaskRequest request = validCreateRequest();
        request.setTimePreference("Midnight");

        assertThatThrownBy(() -> taskService.createTask("customer@example.com", request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("timePreference:");
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void createTask_rejectsAnHourlyRateAboveTheBudget() {
        CreateTaskRequest request = validCreateRequest();
        request.setBudget(new BigDecimal("1500"));
        request.setHourlyRate(new BigDecimal("2000"));

        assertThatThrownBy(() -> taskService.createTask("customer@example.com", request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("hourlyRate:");
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void createTask_rejectsADueDateMoreThanAYearAhead() {
        CreateTaskRequest request = validCreateRequest();
        request.setDueDate(LocalDate.now().plusYears(1).plusDays(1));

        assertThatThrownBy(() -> taskService.createTask("customer@example.com", request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("dueDate:");
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void createTask_acceptsADueDateAndHourlyRateWithinRange() {
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        CreateTaskRequest request = validCreateRequest();
        request.setHourlyRate(new BigDecimal("300"));
        request.setDueDate(LocalDate.now().plusDays(3));
        request.setTimePreference("Morning");

        TaskResponse response = taskService.createTask("customer@example.com", request);

        assertThat(response.getStatus()).isEqualTo(TaskStatus.OPEN);
    }

    @Test
    void listMyTasks_queriesOnlyRequestersOwnTasks() {
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findByCustomerIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(openTaskOwnedBy(customer)));

        List<TaskResponse> tasks = taskService.listMyTasks("customer@example.com", null);

        assertThat(tasks).hasSize(1);
        verify(taskRepository).findByCustomerIdOrderByCreatedAtDesc(1L);
        verify(taskRepository, never()).findByCustomerIdOrderByCreatedAtDesc(2L);
    }

    @Test
    void cancelTask_byNonOwner_isTreatedAsNotFound() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.cancelTask(100L, "other@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void cancelTask_alreadyCompleted_isRejected() {
        Task task = openTaskOwnedBy(customer);
        task.setStatus(TaskStatus.COMPLETED);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.cancelTask(100L, "customer@example.com"))
                .isInstanceOf(InvalidOperationException.class);
    }

    @Test
    void cancelTask_awaitingPayment_isRejected() {
        // The work has already been done. Cancelling out of it would be walking away from
        // money the worker has earned.
        Task task = openTaskOwnedBy(customer);
        task.setStatus(TaskStatus.AWAITING_PAYMENT);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.cancelTask(100L, "customer@example.com"))
                .isInstanceOf(InvalidOperationException.class);
    }

    @Test
    void cancelTask_open_succeedsAndSetsCancelled() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.cancelTask(100L, "customer@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.CANCELLED);
    }

    @Test
    void completeTask_endsTheWorkButNotTheJob() {
        // The distinction the whole balance flow rests on: downing tools is not the same
        // as being paid, so the counter that mirrors COMPLETED must not move yet.
        Task task = requestedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.completeTask(100L, "worker@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.AWAITING_PAYMENT);
        verifyNoInteractions(workerProfileRepository);
        verify(notificationService).notify(
                eq(customer), eq("TASK_AWAITING_PAYMENT"), anyString(), anyString(), anyString());
    }

    @Test
    void markPaidInFull_closesTheJobAndCountsIt() {
        Task task = requestedTask();
        task.setStatus(TaskStatus.AWAITING_PAYMENT);
        WorkerProfile profile = new WorkerProfile();
        profile.setTasksCompleted(4);
        when(workerProfileRepository.findByUserId(3L)).thenReturn(Optional.of(profile));

        taskService.markPaidInFull(task);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(profile.getTasksCompleted()).isEqualTo(5);
        verify(taskRepository).save(task);
    }

    @Test
    void markPaidInFull_fromAnyOtherStatus_isANoOp() {
        // A gateway that delivers the same callback twice must not count the job twice.
        Task task = requestedTask();
        task.setStatus(TaskStatus.COMPLETED);

        taskService.markPaidInFull(task);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        verify(taskRepository, never()).save(any());
        verifyNoInteractions(workerProfileRepository);
    }

    @Test
    void assignWorker_byNonOwner_isTreatedAsNotFound() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherCustomer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.assignWorker(100L, "other@example.com", 3L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void assignWorker_taskNotOpen_isRejected() {
        Task task = openTaskOwnedBy(customer);
        task.setStatus(TaskStatus.ASSIGNED);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.assignWorker(100L, "customer@example.com", 3L))
                .isInstanceOf(InvalidOperationException.class);
        verify(userRepository, never()).findById(any());
    }

    @Test
    void assignWorker_targetIsNotAWorker_isRejected() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(userRepository.findById(2L)).thenReturn(Optional.of(otherCustomer));

        assertThatThrownBy(() -> taskService.assignWorker(100L, "customer@example.com", 2L))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("not a worker");
    }

    @Test
    void assignWorker_unapprovedWorker_isRejected() {
        Task task = openTaskOwnedBy(customer);
        User pendingWorker = User.builder()
                .id(4L).email("pending@example.com").fullName("Pending Worker")
                .phone("9800000004").role(Role.WORKER).status(ApprovalStatus.PENDING).suspended(false)
                .build();
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(userRepository.findById(4L)).thenReturn(Optional.of(pendingWorker));

        assertThatThrownBy(() -> taskService.assignWorker(100L, "customer@example.com", 4L))
                .isInstanceOf(InvalidOperationException.class);
    }

    @Test
    void assignWorker_valid_parksTaskAtRequestedAndNotifiesTheWorker() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(userRepository.findById(3L)).thenReturn(Optional.of(approvedWorker));

        TaskResponse response = taskService.assignWorker(100L, "customer@example.com", 3L);

        // A direct hire is an offer, not a booking - the worker has to answer first.
        assertThat(response.getStatus()).isEqualTo(TaskStatus.REQUESTED);
        assertThat(response.getAssignedWorker().getId()).isEqualTo(3L);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertThat(captor.getValue().getAssignedWorker()).isEqualTo(approvedWorker);

        verify(notificationService).notify(
                eq(approvedWorker), eq("TASK_REQUESTED"), anyString(), anyString(), eq("/worker/jobs"));
    }

    @Test
    void acceptTask_byUnapprovedWorker_isRejected() {
        User pendingWorker = User.builder()
                .id(4L).email("pending@example.com").fullName("Pending Worker")
                .phone("9800000004").role(Role.WORKER).status(ApprovalStatus.PENDING).suspended(false)
                .build();
        when(userRepository.findByEmail("pending@example.com")).thenReturn(Optional.of(pendingWorker));

        assertThatThrownBy(() -> taskService.acceptTask(100L, "pending@example.com"))
                .isInstanceOf(InvalidOperationException.class);
        verify(taskRepository, never()).findById(any());
    }

    @Test
    void acceptTask_taskNotOpen_isRejected() {
        Task task = openTaskOwnedBy(customer);
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.acceptTask(100L, "worker@example.com"))
                .isInstanceOf(InvalidOperationException.class);
    }

    @Test
    void acceptTask_open_parksTaskAtAcceptedUntilAdvanceIsPaid() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.acceptTask(100L, "worker@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
        assertThat(response.getAssignedWorker().getId()).isEqualTo(3L);
    }

    /**
     * Claiming off the open feed used to tell the customer nothing at all, so the only way to
     * find out was to open My Tasks - with the job blocked on an advance they did not know
     * was due. It now announces exactly as a direct hire does.
     */
    @Test
    void acceptTask_open_tellsTheCustomerTheirAdvanceIsDue() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        taskService.acceptTask(100L, "worker@example.com");

        verify(notificationService).notify(
                eq(customer), eq("TASK_ACCEPTED"), anyString(), anyString(), eq("/dashboard/tasks"));
        verify(emailService).sendTemplate(
                eq("customer@example.com"), anyString(), eq("email/task-accepted"), anyMap());
    }

    @Test
    void acceptTask_ownRequest_movesItToAcceptedAndNotifiesTheCustomer() {
        Task task = requestedTask();
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.acceptTask(100L, "worker@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
        assertThat(response.getAssignedWorker().getId()).isEqualTo(3L);
        verify(notificationService).notify(
                eq(customer), eq("TASK_ACCEPTED"), anyString(), anyString(), eq("/dashboard/tasks"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void acceptTask_emailsTheCustomerTheWorkerTaskAndAdvanceShare() {
        Task task = requestedTask();
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        taskService.acceptTask(100L, "worker@example.com");

        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(
                eq("customer@example.com"), anyString(), eq("email/task-accepted"), model.capture());
        assertThat(model.getValue())
                .containsEntry("name", "Customer")
                .containsEntry("workerName", "Worker One")
                .containsEntry("taskTitle", task.getTitle())
                // Rendered from the injected rate rather than hardcoded, so the email cannot
                // quote a share the checkout page does not charge.
                .containsEntry("advancePercent", "10%")
                .containsEntry("tasksUrl", "http://localhost:5173/dashboard/tasks");
    }

    /**
     * The acceptance is the business fact; the email is a courtesy. Letting an
     * EmailDeliveryException escape the transactional accept would mark it rollback-only and
     * silently undo the worker's yes because the mail server was down.
     */
    @Test
    void acceptTask_whenTheEmailCannotBeSent_stillAcceptsTheTask() {
        Task task = requestedTask();
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        doThrow(new EmailDeliveryException("smtp down", null))
                .when(emailService).sendTemplate(anyString(), anyString(), anyString(), anyMap());

        TaskResponse response = taskService.acceptTask(100L, "worker@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
        verify(notificationService).notify(
                eq(customer), eq("TASK_ACCEPTED"), anyString(), anyString(), eq("/dashboard/tasks"));
    }

    @Test
    void acceptTask_someoneElsesRequest_isTreatedAsNotFound() {
        Task task = requestedTask();
        User otherWorker = User.builder()
                .id(5L).email("other-worker@example.com").fullName("Worker Two")
                .phone("9800000005").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        when(userRepository.findByEmail("other-worker@example.com")).thenReturn(Optional.of(otherWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        // A requested task has left the open pool, so it must not be claimable by anyone else.
        assertThatThrownBy(() -> taskService.acceptTask(100L, "other-worker@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(task.getAssignedWorker()).isEqualTo(approvedWorker);
        verifyNoInteractions(notificationService, emailService);
    }

    @Test
    void declineRequest_returnsTheTaskToTheOpenPoolAndNotifiesTheCustomer() {
        Task task = requestedTask();
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.declineRequest(100L, "worker@example.com");

        // Back on the public feed rather than cancelled, so the customer can hire someone else.
        assertThat(response.getStatus()).isEqualTo(TaskStatus.OPEN);
        assertThat(response.getAssignedWorker()).isNull();
        verify(notificationService).notify(
                eq(customer), eq("TASK_DECLINED"), anyString(), anyString(), eq("/dashboard/tasks"));
    }

    @Test
    void declineRequest_someoneElsesRequest_isTreatedAsNotFound() {
        Task task = requestedTask();
        User otherWorker = User.builder()
                .id(5L).email("other-worker@example.com").fullName("Worker Two")
                .phone("9800000005").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        when(userRepository.findByEmail("other-worker@example.com")).thenReturn(Optional.of(otherWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.declineRequest(100L, "other-worker@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(task.getStatus()).isEqualTo(TaskStatus.REQUESTED);
    }

    @Test
    void declineRequest_afterTheJobIsAlreadyUnderway_isRejected() {
        Task task = requestedTask();
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.declineRequest(100L, "worker@example.com"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("no longer be declined");
        assertThat(task.getAssignedWorker()).isEqualTo(approvedWorker);
    }

    @Test
    void startTask_beforeAdvanceIsPaid_isRejected() {
        Task task = openTaskOwnedBy(customer);
        task.setStatus(TaskStatus.ACCEPTED);
        task.setAssignedWorker(approvedWorker);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> taskService.startTask(100L, "worker@example.com"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("not ready to be started");
        assertThat(task.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
    }
}
