package com.sewasathi.service;

import com.sewasathi.dto.response.ConversationResponse;
import com.sewasathi.dto.response.MessageResponse;
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

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chat is one-to-one between a customer and a worker. A conversation covers every
 * task the two share, so hiring the same worker again continues the same thread
 * instead of starting a new one.
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations(String userEmail) {
        User user = getUser(userEmail);
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

        return tasksByPeer.values().stream()
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
        broadcast(ConversationKey.of(message.getTask()), response);
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
        broadcast(ConversationKey.of(task), response);
        return response;
    }

    private void broadcast(ConversationKey key, MessageResponse response) {
        messagingTemplate.convertAndSend("/topic/conversations/" + key, response);
    }

    /**
     * Returns the tasks behind a conversation, oldest first. Non-participants and
     * unknown keys get a 404 rather than a 403 so conversations cannot be enumerated.
     */
    private List<Task> resolveConversation(User user, String conversationKey) {
        ConversationKey key = ConversationKey.parse(conversationKey);
        if (key == null) {
            throw new ResourceNotFoundException("No conversation " + conversationKey);
        }
        if (!key.includes(user) && user.getRole() != Role.ADMIN) {
            throw new ResourceNotFoundException("No conversation " + conversationKey);
        }
        List<Task> sharedTasks = taskRepository
                .findByCustomerIdAndAssignedWorkerIdOrderByCreatedAtAsc(key.customerId(), key.workerId());
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
