package com.sewasathi.websocket;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.security.JwtService;
import com.sewasathi.service.ChatAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The socket is the other way into a conversation, so it has to refuse the same threads
 * {@code MessageService} refuses - above all one whose advance has not been paid.
 */
@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    private static final String TOPIC = "/topic/conversations/c1-w2";
    private static final String SEND_DESTINATION = "/app/conversations/c1-w2/send";

    @Mock
    private JwtService jwtService;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private PaymentRepository paymentRepository;

    private StompAuthChannelInterceptor interceptor;
    private MessageChannel channel;

    private User customer;

    @BeforeEach
    void setUp() {
        interceptor = new StompAuthChannelInterceptor(
                jwtService, userDetailsService, userRepository,
                new ChatAccessService(taskRepository, paymentRepository)
        );
        channel = mock(MessageChannel.class);

        customer = User.builder()
                .id(1L).email("customer@example.com").fullName("Customer One")
                .phone("9800000001").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        User worker = User.builder()
                .id(2L).email("worker@example.com").fullName("Worker One")
                .phone("9800000002").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();

        lenient().when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        lenient().when(taskRepository.findByCustomerIdAndAssignedWorkerIdOrderByCreatedAtAsc(1L, 2L))
                .thenReturn(List.of(task(10L, customer, worker)));
    }

    private Task task(Long id, User taskCustomer, User assignedWorker) {
        return Task.builder()
                .id(id).customer(taskCustomer).assignedWorker(assignedWorker)
                .title("Kitchen sink").category("Cleaning").description("desc")
                .city("Kathmandu").location("Baneshwor")
                .budget(new BigDecimal("1000")).status(TaskStatus.ACCEPTED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /** Makes the 10% advance look settled on exactly these tasks and no others. */
    private void advancePaidOn(Long... taskIds) {
        when(paymentRepository.findTaskIdsByTaskIdInAndStatus(anyCollection(), eq(PaymentStatus.COMPLETED)))
                .thenReturn(List.of(taskIds));
    }

    private Message<byte[]> frame(StompCommand command, String destination, User user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setUser(new UsernamePasswordAuthenticationToken(user.getEmail(), null, List.of()));
        accessor.setLeaveMutable(true);
        return org.springframework.messaging.support.MessageBuilder
                .createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void subscribingIsRefusedUntilTheAdvanceIsPaid() {
        advancePaidOn();

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, TOPIC, customer), channel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("c1-w2");
    }

    @Test
    void sendingIsRefusedUntilTheAdvanceIsPaid() {
        advancePaidOn();

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SEND, SEND_DESTINATION, customer), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void subscribingIsAllowedOnceTheAdvanceHasSettled() {
        advancePaidOn(10L);

        assertThatCode(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, TOPIC, customer), channel))
                .doesNotThrowAnyException();
    }

    @Test
    void sendingIsAllowedOnceTheAdvanceHasSettled() {
        advancePaidOn(10L);

        assertThatCode(() -> interceptor.preSend(frame(StompCommand.SEND, SEND_DESTINATION, customer), channel))
                .doesNotThrowAnyException();
    }

    @Test
    void aStrangersConversationStaysOutOfReachEvenWhenPaid() {
        User stranger = User.builder()
                .id(3L).email("stranger@example.com").fullName("Stranger")
                .phone("9800000003").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        when(userRepository.findByEmail(stranger.getEmail())).thenReturn(Optional.of(stranger));

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, TOPIC, stranger), channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void unauthenticatedFramesAreRefused() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(TOPIC);
        accessor.setLeaveMutable(true);
        Message<byte[]> anonymous = org.springframework.messaging.support.MessageBuilder
                .createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(anonymous, channel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Not authenticated");
    }

    @Test
    void destinationsOutsideChatAreLeftAlone() {
        Message<byte[]> other = frame(StompCommand.SUBSCRIBE, "/user/queue/notifications", customer);

        assertThatCode(() -> interceptor.preSend(other, channel)).doesNotThrowAnyException();
    }
}
