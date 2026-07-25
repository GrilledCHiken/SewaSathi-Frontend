package com.sewasathi.service;

import com.sewasathi.dto.request.CreateTaskRequest;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
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

    private TaskService taskService;

    private User customer;
    private User otherCustomer;
    private User approvedWorker;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, userRepository, workerProfileRepository);

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

    @Test
    void createTask_defaultsToOpenStatus() {
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Clean my house");
        request.setCategory("Cleaning");
        request.setDescription("Full house cleaning");
        request.setCity("Kathmandu");
        request.setLocation("Baneshwor");
        request.setBudget(new BigDecimal("1500"));

        TaskResponse response = taskService.createTask("customer@example.com", request);

        assertThat(response.getStatus()).isEqualTo(TaskStatus.OPEN);
        assertThat(response.getCustomer().getId()).isEqualTo(customer.getId());
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
    void cancelTask_open_succeedsAndSetsCancelled() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.cancelTask(100L, "customer@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.CANCELLED);
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
    void assignWorker_valid_setsAssignedWorkerAndStatus() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(customer));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(userRepository.findById(3L)).thenReturn(Optional.of(approvedWorker));

        TaskResponse response = taskService.assignWorker(100L, "customer@example.com", 3L);

        assertThat(response.getStatus()).isEqualTo(TaskStatus.ASSIGNED);
        assertThat(response.getAssignedWorker().getId()).isEqualTo(3L);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertThat(captor.getValue().getAssignedWorker()).isEqualTo(approvedWorker);
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
    void acceptTask_open_succeeds() {
        Task task = openTaskOwnedBy(customer);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(approvedWorker));
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        TaskResponse response = taskService.acceptTask(100L, "worker@example.com");

        assertThat(response.getStatus()).isEqualTo(TaskStatus.ASSIGNED);
        assertThat(response.getAssignedWorker().getId()).isEqualTo(3L);
    }
}
