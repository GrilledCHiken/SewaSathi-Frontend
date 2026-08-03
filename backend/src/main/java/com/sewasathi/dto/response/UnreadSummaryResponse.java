package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Map;

/**
 * Seeds every unread badge in one request: the total for the Messages nav item, and the
 * per-conversation counts for the conversation list. Conversations with nothing unread are
 * left out of the map rather than sent as zeroes.
 */
@Getter
@AllArgsConstructor
public class UnreadSummaryResponse {
    private long total;
    private Map<String, Long> byConversation;
}
