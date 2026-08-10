package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * What travels over the chat socket, on both {@code /topic/conversations/{key}} and the
 * per-user {@code /user/queue/chat} stream. Tagged by {@code type} because messages and read
 * receipts reach the same subscribers; exactly one of {@code message} and {@code read} is set.
 */
@Getter
@AllArgsConstructor
public class ChatEvent {

    public static final String MESSAGE = "MESSAGE";
    public static final String READ = "READ";

    private String type;
    /** Lifted out of the payload so a client can route the event without unwrapping it. */
    private String conversationKey;
    private MessageResponse message;
    private ReadReceiptResponse read;

    public static ChatEvent message(String conversationKey, MessageResponse message) {
        return new ChatEvent(MESSAGE, conversationKey, message, null);
    }

    public static ChatEvent read(ReadReceiptResponse read) {
        return new ChatEvent(READ, read.getConversationKey(), null, read);
    }
}
