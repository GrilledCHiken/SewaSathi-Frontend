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

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations(String userEmail) {
        User user = getUser(userEmail);
        List<Task> tasks = user.getRole() == Role.WORKER
                ? taskRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(user.getId())
                : taskRepository.findByCustomerIdAndAssignedWorkerIsNotNullOrderByUpdatedAtDesc(user.getId());

        return tasks.stream()
                .map(task -> {
                    Message last = messageRepository.findFirstByTaskIdOrderByCreatedAtDesc(task.getId());
                    return ConversationResponse.of(task, user, last != null ? MessageResponse.from(last) : null);
                })
                .sorted(Comparator.comparing(
                        (ConversationResponse c) -> c.getLastMessage() != null ? c.getLastMessage().getCreatedAt() : null,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getHistory(String userEmail, Long taskId) {
        User user = getUser(userEmail);
        Task task = getTaskOrThrow(taskId);
        ensureParticipant(task, user);
        return messageRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(MessageResponse::from)
                .toList();
    }

    @Transactional
    public MessageResponse sendTextMessage(String senderEmail, Long taskId, String content) {
        return persistAndBroadcast(senderEmail, taskId, content, null, null, null);
    }

    @Transactional
    public MessageResponse sendAttachmentMessage(
            String senderEmail, Long taskId, String attachmentUrl, String attachmentName, String attachmentType
    ) {
        return persistAndBroadcast(senderEmail, taskId, null, attachmentUrl, attachmentName, attachmentType);
    }

    private MessageResponse persistAndBroadcast(
            String senderEmail, Long taskId, String content,
            String attachmentUrl, String attachmentName, String attachmentType
    ) {
        User sender = getUser(senderEmail);
        Task task = getTaskOrThrow(taskId);
        ensureParticipant(task, sender);

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
        messagingTemplate.convertAndSend("/topic/tasks/" + taskId, response);
        return response;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }

    private Task getTaskOrThrow(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("No task with id " + taskId));
    }

    private void ensureParticipant(Task task, User user) {
        if (task.getAssignedWorker() == null) {
            throw new InvalidOperationException("This task has no assigned worker yet");
        }
        boolean isCustomer = task.getCustomer().getId().equals(user.getId());
        boolean isWorker = task.getAssignedWorker().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isCustomer && !isWorker && !isAdmin) {
            throw new ResourceNotFoundException("No task with id " + task.getId());
        }
    }
}
