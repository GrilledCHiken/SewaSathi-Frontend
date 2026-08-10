package com.sewasathi.service;

import com.sewasathi.dto.response.NotificationResponse;
import com.sewasathi.entity.Notification;
import com.sewasathi.entity.User;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.NotificationRepository;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * In-app notifications: persisted so they survive a reload or an offline period, and pushed
 * live over the STOMP broker the chat feature already uses.
 *
 * <p>Delivery is to a per-user destination ({@code /user/queue/notifications}), so Spring's
 * user-destination routing does the access control and one account cannot subscribe to
 * another's stream.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public static final String USER_DESTINATION = "/queue/notifications";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public NotificationResponse notify(User user, String type, String title, String body, String link) {
        Notification saved = notificationRepository.save(Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .build());

        NotificationResponse payload = NotificationResponse.from(saved);
        try {
            messagingTemplate.convertAndSendToUser(user.getEmail(), USER_DESTINATION, payload);
        } catch (RuntimeException e) {
            // The notification is already persisted; the recipient will see it on next load.
            // A broker hiccup must not roll back the business action that triggered it.
            log.warn("Could not push notification {} to {}", saved.getId(), user.getEmail(), e);
        }
        return payload;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(String email, int limit) {
        User user = getUser(email);
        Page<Notification> page = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, Math.min(limit, 100)));
        return page.getContent().stream().map(NotificationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(String email) {
        return notificationRepository.countByUserIdAndReadFalse(getUser(email).getId());
    }

    @Transactional
    public void markRead(String email, Long notificationId) {
        User user = getUser(email);
        Notification notification = notificationRepository
                .findByIdAndUserId(notificationId, user.getId())
                // Scoped by owner, so someone else's id is indistinguishable from a missing one.
                .orElseThrow(() -> new ResourceNotFoundException("No notification with id " + notificationId));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(String email) {
        User user = getUser(email);
        notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 500))
                .forEach(n -> n.setRead(true));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }
}
