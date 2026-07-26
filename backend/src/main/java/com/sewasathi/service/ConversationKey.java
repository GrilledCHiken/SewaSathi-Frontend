package com.sewasathi.service;

import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Identifies a one-to-one chat between a customer and a worker, e.g. {@code c12-w7}.
 * Both participants derive the same key, so it doubles as the STOMP topic suffix.
 */
public record ConversationKey(Long customerId, Long workerId) {

    private static final Pattern PATTERN = Pattern.compile("c(\\d+)-w(\\d+)");

    /** Returns null when the key is malformed, so callers can decide how to fail. */
    public static ConversationKey parse(String raw) {
        if (raw == null) {
            return null;
        }
        Matcher matcher = PATTERN.matcher(raw);
        if (!matcher.matches()) {
            return null;
        }
        return new ConversationKey(Long.valueOf(matcher.group(1)), Long.valueOf(matcher.group(2)));
    }

    /** Returns null when the task has no assigned worker, i.e. no chat exists yet. */
    public static ConversationKey of(Task task) {
        if (task == null || task.getAssignedWorker() == null) {
            return null;
        }
        return new ConversationKey(task.getCustomer().getId(), task.getAssignedWorker().getId());
    }

    public boolean includes(User user) {
        return customerId.equals(user.getId()) || workerId.equals(user.getId());
    }

    public Long peerOf(User user) {
        return customerId.equals(user.getId()) ? workerId : customerId;
    }

    @Override
    public String toString() {
        return "c" + customerId + "-w" + workerId;
    }
}
