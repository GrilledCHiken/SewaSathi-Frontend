package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Says that {@code readerId} has caught up on a conversation: every message they had not sent
 * is now read as of {@code readAt}. One receipt covers the whole thread rather than one per
 * message, since a reader only ever opens a thread as a whole.
 */
@Getter
@AllArgsConstructor
public class ReadReceiptResponse {
    private String conversationKey;
    private Long readerId;
    private LocalDateTime readAt;
}
