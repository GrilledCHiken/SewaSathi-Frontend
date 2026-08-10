package com.sewasathi.dto.response;

import com.sewasathi.entity.ContactMessage;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * One contact-form inquiry as the admin console sees it. The body is capped at 2000 characters
 * and travels with the list row, so the inbox can open one without a second request.
 */
@Getter
@AllArgsConstructor
public class ContactMessageResponse {
    private Long id;
    private String name;
    private String email;
    private String subject;
    private String message;
    private boolean handled;
    private LocalDateTime handledAt;
    private LocalDateTime createdAt;

    public static ContactMessageResponse from(ContactMessage message) {
        return new ContactMessageResponse(
                message.getId(),
                message.getName(),
                message.getEmail(),
                message.getSubject(),
                message.getMessage(),
                message.isHandled(),
                message.getHandledAt(),
                message.getCreatedAt()
        );
    }
}
