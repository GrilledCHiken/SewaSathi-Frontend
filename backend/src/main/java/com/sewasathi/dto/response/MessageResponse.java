package com.sewasathi.dto.response;

import com.sewasathi.entity.Message;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private String content;
    private String attachmentUrl;
    private String attachmentName;
    private String attachmentType;
    private TaskPartyResponse sender;
    private LocalDateTime createdAt;
    private boolean deleted;
    /** When the other party opened the thread, or null while the message is still unread. */
    private LocalDateTime readAt;

    public static MessageResponse from(Message message) {
        // A deleted message keeps its place in the thread but never ships its body.
        if (message.isDeleted()) {
            return new MessageResponse(
                    message.getId(),
                    message.getTask().getId(),
                    message.getTask().getTitle(),
                    null,
                    null,
                    null,
                    null,
                    TaskPartyResponse.from(message.getSender()),
                    message.getCreatedAt(),
                    true,
                    null
            );
        }
        return new MessageResponse(
                message.getId(),
                message.getTask().getId(),
                message.getTask().getTitle(),
                message.getContent(),
                message.getAttachmentUrl(),
                message.getAttachmentName(),
                message.getAttachmentType(),
                TaskPartyResponse.from(message.getSender()),
                message.getCreatedAt(),
                false,
                message.getReadAt()
        );
    }
}
