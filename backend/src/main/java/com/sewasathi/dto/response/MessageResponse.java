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
    private String content;
    private String attachmentUrl;
    private String attachmentName;
    private String attachmentType;
    private TaskPartyResponse sender;
    private LocalDateTime createdAt;

    public static MessageResponse from(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getTask().getId(),
                message.getContent(),
                message.getAttachmentUrl(),
                message.getAttachmentName(),
                message.getAttachmentType(),
                TaskPartyResponse.from(message.getSender()),
                message.getCreatedAt()
        );
    }
}
