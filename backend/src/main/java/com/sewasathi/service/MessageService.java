package com.sewasathi.service;

import com.sewasathi.dto.response.ChatEvent;
import com.sewasathi.dto.response.ConversationResponse;
import com.sewasathi.dto.response.MessageResponse;
import com.sewasathi.dto.response.ReadReceiptResponse;
import com.sewasathi.dto.response.UnreadSummaryResponse;
import com.sewasathi.entity.Message;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.MessageRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chat is one-to-one between a customer and a worker, and a conversation covers every task the
 * two share. Threads exist only once the advance has settled - see {@link ChatAccessService}.
 * Live updates go out on two streams: the conversation topic for whoever has the thread open,
 * and the recipient's personal queue, which keeps unread badges moving while it is closed.
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private static final String USER_CHAT_QUEUE = "/queue/chat";

    private final MessageRepository messageRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ChatAccessService chatAccessService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations(String userEmail) {
        User user = getUser(userEmail);

        return unlockedThreadsByPeer(user).values().stream()
                .map(sharedTasks -> {
                    Message last = messageRepository.findFirstByTaskIdInOrderByCreatedAtDesc(
                            sharedTasks.stream().map(Task::getId).toList()
                    );
                    return ConversationResponse.of(
                            sharedTasks, user, last != null ? MessageResponse.from(last) : null
                    );
                })
                .sorted(Comparator.comparing(
                        (ConversationResponse c) -> c.getLastMessage() != null ? c.getLastMessage().getCreatedAt() : null,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(String userEmail, String conversationKey) {
        List<Task> sharedTasks = resolveConversation(getUser(userEmail), conversationKey);
        return messageRepository
                .findByTaskIdInOrderByCreatedAtAsc(sharedTasks.stream().map(Task::getId).toList())
                .stream()
                .map(MessageResponse::from)
                .toList();
    }

    /**
     * Every unread badge in the app in one query: the total for the Messages nav item and the
     * per-conversation counts for the conversation list.
     */
    @Transactional(readOnly = true)
    public UnreadSummaryResponse unreadSummary(String userEmail) {
        User user = getUser(userEmail);
        Map<Long, List<Task>> threads = unlockedThreadsByPeer(user);
        if (threads.isEmpty()) {
            return new UnreadSummaryResponse(0, Map.of());
        }

        // One count per task, then folded up per conversation, which spans several tasks.
        List<Long> allTaskIds = threads.values().stream().flatMap(List::stream).map(Task::getId).toList();
        Map<Long, Long> unreadByTask = new HashMap<>();
        for (MessageRepository.TaskUnreadCount row : messageRepository.countUnreadByTask(allTaskIds, user.getId())) {
            unreadByTask.put(row.getTaskId(), row.getUnread());
        }

        Map<String, Long> byConversation = new LinkedHashMap<>();
        long total = 0;
        for (List<Task> sharedTasks : threads.values()) {
            long unread = sharedTasks.stream()
                    .mapToLong(task -> unreadByTask.getOrDefault(task.getId(), 0L))
                    .sum();
            if (unread == 0) {
                continue;
            }
            byConversation.put(ConversationKey.of(sharedTasks.get(0)).toString(), unread);
            total += unread;
        }
        return new UnreadSummaryResponse(total, byConversation);
    }

    /**
     * Marks everything the reader did not send as read and tells both sides: the topic flips
     * the sender's ticks, the reader's own queue clears the badge in their other tabs.
     *
     * @return how many messages were actually unread, so a no-op stays silent
     */
    @Transactional
    public int markConversationRead(String userEmail, String conversationKey) {
        User user = getUser(userEmail);
        List<Task> sharedTasks = resolveConversation(user, conversationKey);

        LocalDateTime now = LocalDateTime.now();
        int updated = messageRepository.markRead(
                sharedTasks.stream().map(Task::getId).toList(), user.getId(), now
        );
        if (updated == 0) {
            return 0;
        }

        ConversationKey key = ConversationKey.of(sharedTasks.get(0));
        ChatEvent event = ChatEvent.read(new ReadReceiptResponse(key.toString(), user.getId(), now));
        broadcast(key, event);
        pushToUser(user, event);
        return updated;
    }

    @Transactional
    public MessageResponse sendTextMessage(String senderEmail, String conversationKey, String content) {
        return persistAndBroadcast(senderEmail, conversationKey, content, null, null, null);
    }

    @Transactional
    public MessageResponse sendAttachmentMessage(
            String senderEmail, String conversationKey,
            String attachmentUrl, String attachmentName, String attachmentType
    ) {
        return persistAndBroadcast(senderEmail, conversationKey, null, attachmentUrl, attachmentName, attachmentType);
    }

    /**
     * Soft deletes a message for both participants. Only the sender may delete, and
     * the tombstone is broadcast so open threads update without a refresh.
     */
    @Transactional
    public MessageResponse deleteMessage(String userEmail, Long messageId) {
        User user = getUser(userEmail);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("No message with id " + messageId));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new InvalidOperationException("You can only delete your own messages");
        }
        if (message.isDeleted()) {
            return MessageResponse.from(message);
        }

        String attachmentUrl = message.getAttachmentUrl();
        message.setDeleted(true);
        message.setContent(null);
        message.setAttachmentUrl(null);
        message.setAttachmentName(null);
        message.setAttachmentType(null);
        message = messageRepository.save(message);

        if (attachmentUrl != null) {
            fileStorageService.delete(attachmentUrl);
        }

        MessageResponse response = MessageResponse.from(message);
        Task task = message.getTask();
        ConversationKey key = ConversationKey.of(task);
        ChatEvent event = ChatEvent.message(key.toString(), response);
        broadcast(key, event);
        // Deleting an unread message drops the other side's count, so they need the
        // tombstone even with the thread closed.
        pushToUser(peerOf(task, user), event);
        return response;
    }

    private MessageResponse persistAndBroadcast(
            String senderEmail, String conversationKey, String content,
            String attachmentUrl, String attachmentName, String attachmentType
    ) {
        User sender = getUser(senderEmail);
        List<Task> sharedTasks = resolveConversation(sender, conversationKey);
        // New messages hang off the newest shared task, which is the job being worked on now.
        Task task = sharedTasks.get(sharedTasks.size() - 1);

        Message message = Message.builder()
                .task(task)
                .sender(sender)
                .content(content)
                .attachmentUrl(attachmentUrl)
                .attachmentName(attachmentName)
                .attachmentType(attachmentType)
                .build();
        message = messageRepository.save(message);

        MessageResponse response = MessageResponse.from(message);
        ConversationKey key = ConversationKey.of(task);
        ChatEvent event = ChatEvent.message(key.toString(), response);
        broadcast(key, event);
        pushToUser(peerOf(task, sender), event);
        return response;
    }

    private void broadcast(ConversationKey key, ChatEvent event) {
        messagingTemplate.convertAndSend("/topic/conversations/" + key, event);
    }

    /**
     * Sends on the recipient's personal stream. Spring resolves the {@code /user} prefix against
     * the authenticated STOMP session, and that session is keyed by email - see
     * {@code UserPrincipal.getUsername()}.
     */
    private void pushToUser(User recipient, ChatEvent event) {
        messagingTemplate.convertAndSendToUser(recipient.getEmail(), USER_CHAT_QUEUE, event);
    }

    /** The other participant on a task. Chat is one-to-one, so there is only ever one. */
    private User peerOf(Task task, User user) {
        return user.getId().equals(task.getCustomer().getId())
                ? task.getAssignedWorker()
                : task.getCustomer();
    }

    /**
     * The user's open threads, keyed by the person on the other side and holding every task
     * they share, oldest first. One paid-task lookup covers the lot; people hired but not yet
     * paid are dropped, since their thread is not open.
     */
    private Map<Long, List<Task>> unlockedThreadsByPeer(User user) {
        List<Task> tasks = user.getRole() == Role.WORKER
                ? taskRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(user.getId())
                : taskRepository.findByCustomerIdAndAssignedWorkerIsNotNullOrderByUpdatedAtDesc(user.getId());

        Map<Long, List<Task>> tasksByPeer = new LinkedHashMap<>();
        for (Task task : tasks) {
            if (task.getAssignedWorker() == null) {
                continue;
            }
            Long peerId = task.getCustomer().getId().equals(user.getId())
                    ? task.getAssignedWorker().getId()
                    : task.getCustomer().getId();
            tasksByPeer.computeIfAbsent(peerId, id -> new ArrayList<>()).add(task);
        }

        Set<Long> paidTaskIds = chatAccessService.paidTaskIds(tasks.stream().map(Task::getId).toList());
        tasksByPeer.values().removeIf(
                sharedTasks -> sharedTasks.stream().noneMatch(task -> paidTaskIds.contains(task.getId()))
        );
        return tasksByPeer;
    }

    /**
     * Returns the tasks behind a conversation, oldest first. Non-participants, unknown
     * keys and threads whose advance has not been paid all get a 404 rather than a 403,
     * so conversations cannot be enumerated and an unpaid one leaves no trace.
     */
    private List<Task> resolveConversation(User user, String conversationKey) {
        ConversationKey key = ConversationKey.parse(conversationKey);
        if (key == null) {
            throw new ResourceNotFoundException("No conversation " + conversationKey);
        }
        if (!key.includes(user) && user.getRole() != Role.ADMIN) {
            throw new ResourceNotFoundException("No conversation " + conversationKey);
        }
        List<Task> sharedTasks = chatAccessService.unlockedSharedTasks(key);
        if (sharedTasks.isEmpty()) {
            throw new ResourceNotFoundException("No conversation " + conversationKey);
        }
        return sharedTasks;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }
}
