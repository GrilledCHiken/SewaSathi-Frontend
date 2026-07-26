package com.sewasathi.service;

import com.sewasathi.dto.response.ConversationResponse;
import com.sewasathi.dto.response.MessageResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Message;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.MessageRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private MessageService messageService;

    private User customer;
    private User worker;
    private User stranger;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(
                messageRepository, taskRepository, userRepository, fileStorageService, messagingTemplate
        );

        customer = User.builder()
                .id(1L).email("customer@example.com").fullName("Customer One")
                .phone("9800000001").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        worker = User.builder()
                .id(2L).email("worker@example.com").fullName("Worker One")
                .phone("9800000002").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        stranger = User.builder()
                .id(3L).email("stranger@example.com").fullName("Stranger")
                .phone("9800000003").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();

        lenient().when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        lenient().when(userRepository.findByEmail(worker.getEmail())).thenReturn(Optional.of(worker));
        lenient().when(userRepository.findByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));
        lenient().when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Task task(Long id, String title, User taskCustomer, User assignedWorker) {
        return Task.builder()
                .id(id).customer(taskCustomer).assignedWorker(assignedWorker)
                .title(title).category("Cleaning").description("desc")
                .city("Kathmandu").location("Baneshwor")
                .budget(new BigDecimal("1000")).status(TaskStatus.ASSIGNED)
                .createdAt(LocalDateTime.now().minusDays(10 - id))
                .build();
    }

    private Message message(Long id, Task onTask, User sender, String content) {
        return Message.builder()
                .id(id).task(onTask).sender(sender).content(content)
                .createdAt(LocalDateTime.now().minusMinutes(60 - id))
                .build();
    }

    @Test
    void listConversationsMergesEveryTaskSharedWithTheSamePerson() {
        Task first = task(10L, "Kitchen sink", customer, worker);
        Task second = task(11L, "Wiring fix", customer, worker);
        when(taskRepository.findByCustomerIdAndAssignedWorkerIsNotNullOrderByUpdatedAtDesc(customer.getId()))
                .thenReturn(List.of(second, first));
        when(messageRepository.findFirstByTaskIdInOrderByCreatedAtDesc(anyCollection()))
                .thenReturn(message(5L, second, worker, "on my way"));

        List<ConversationResponse> conversations = messageService.listConversations(customer.getEmail());

        assertThat(conversations).hasSize(1);
        ConversationResponse conversation = conversations.get(0);
        assertThat(conversation.getConversationKey()).isEqualTo("c1-w2");
        assertThat(conversation.getPeerId()).isEqualTo(worker.getId());
        assertThat(conversation.getTaskCount()).isEqualTo(2);
        assertThat(conversation.getTaskIds()).containsExactlyInAnyOrder(10L, 11L);
        // The newest shared task is what the sidebar and chat header label the thread with.
        assertThat(conversation.getLatestTaskTitle()).isEqualTo("Wiring fix");
        assertThat(conversation.getLastMessage().getContent()).isEqualTo("on my way");
    }

    @Test
    void listConversationsKeepsDifferentPeopleApart() {
        Task withWorker = task(10L, "Kitchen sink", customer, worker);
        Task withOtherCustomer = task(11L, "Painting", stranger, worker);
        when(taskRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(worker.getId()))
                .thenReturn(List.of(withOtherCustomer, withWorker));
        when(messageRepository.findFirstByTaskIdInOrderByCreatedAtDesc(anyCollection())).thenReturn(null);

        List<ConversationResponse> conversations = messageService.listConversations(worker.getEmail());

        assertThat(conversations).hasSize(2);
        assertThat(conversations).extracting(ConversationResponse::getConversationKey)
                .containsExactlyInAnyOrder("c1-w2", "c3-w2");
    }

    @Test
    void getHistoryReturnsMessagesFromEverySharedTask() {
        Task first = task(10L, "Kitchen sink", customer, worker);
        Task second = task(11L, "Wiring fix", customer, worker);
        when(taskRepository.findByCustomerIdAndAssignedWorkerIdOrderByCreatedAtAsc(1L, 2L))
                .thenReturn(List.of(first, second));
        when(messageRepository.findByTaskIdInOrderByCreatedAtAsc(List.of(10L, 11L)))
                .thenReturn(List.of(message(1L, first, customer, "hello"), message(2L, second, worker, "hi")));

        List<MessageResponse> history = messageService.getHistory(worker.getEmail(), "c1-w2");

        assertThat(history).extracting(MessageResponse::getContent).containsExactly("hello", "hi");
        assertThat(history).extracting(MessageResponse::getTaskTitle)
                .containsExactly("Kitchen sink", "Wiring fix");
    }

    @Test
    void nonParticipantsCannotReadAConversation() {
        assertThatThrownBy(() -> messageService.getHistory(stranger.getEmail(), "c1-w2"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(messageRepository, never()).findByTaskIdInOrderByCreatedAtAsc(anyCollection());
    }

    @Test
    void malformedConversationKeyIsRejected() {
        assertThatThrownBy(() -> messageService.getHistory(customer.getEmail(), "not-a-key"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void sendingAttachesTheMessageToTheNewestSharedTask() {
        Task first = task(10L, "Kitchen sink", customer, worker);
        Task second = task(11L, "Wiring fix", customer, worker);
        when(taskRepository.findByCustomerIdAndAssignedWorkerIdOrderByCreatedAtAsc(1L, 2L))
                .thenReturn(List.of(first, second));

        MessageResponse sent = messageService.sendTextMessage(customer.getEmail(), "c1-w2", "when can you come?");

        assertThat(sent.getTaskId()).isEqualTo(second.getId());
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations/c1-w2"), payload.capture());
        assertThat(payload.getValue()).isInstanceOf(MessageResponse.class);
    }

    @Test
    void deletingOwnMessageTombstonesItAndDropsItsAttachment() {
        Task onTask = task(10L, "Kitchen sink", customer, worker);
        Message own = message(7L, onTask, customer, null);
        own.setAttachmentUrl("/uploads/abc.png");
        own.setAttachmentName("abc.png");
        own.setAttachmentType("image/png");
        when(messageRepository.findById(7L)).thenReturn(Optional.of(own));

        MessageResponse deleted = messageService.deleteMessage(customer.getEmail(), 7L);

        assertThat(deleted.isDeleted()).isTrue();
        assertThat(deleted.getContent()).isNull();
        assertThat(deleted.getAttachmentUrl()).isNull();
        assertThat(own.isDeleted()).isTrue();
        verify(fileStorageService).delete("/uploads/abc.png");
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations/c1-w2"), any(Object.class));
    }

    @Test
    void deletingSomeoneElsesMessageIsRejected() {
        Task onTask = task(10L, "Kitchen sink", customer, worker);
        Message theirs = message(7L, onTask, worker, "on my way");
        when(messageRepository.findById(7L)).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> messageService.deleteMessage(customer.getEmail(), 7L))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("your own messages");
        assertThat(theirs.isDeleted()).isFalse();
        verify(messageRepository, never()).save(any(Message.class));
    }
}
