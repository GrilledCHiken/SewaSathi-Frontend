package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * What travels over the chat socket, on both {@code /topic/conversations/{key}} and the
 * per-user {@code /user/queue/chat} stream.
 *
 * <p>The topic used to carry a bare {@link MessageResponse}. Read receipts have to reach the
 * same subscribers, so the payload is tagged rather than left for the client to identify by
 * guessing at which fields are present. Exactly one of {@code message} and {@code read} is set,
 * per {@code type}.
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
