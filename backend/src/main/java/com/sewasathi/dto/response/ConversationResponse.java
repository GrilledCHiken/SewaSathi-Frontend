package com.sewasathi.dto.response;

import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Comparator;
import java.util.List;

@Getter
@AllArgsConstructor
public class ConversationResponse {
    private String conversationKey;
    private Long peerId;
    private TaskPartyResponse otherParty;
    private String latestTaskTitle;
    private String latestCategory;
    private String latestTaskStatus;
    private int taskCount;
    private List<Long> taskIds;
    private MessageResponse lastMessage;

    /**
     * Builds the single conversation a viewer has with one other person, covering
     * every task they share. {@code sharedTasks} must be non-empty and all involve
     * the same customer/worker pair.
     */
    public static ConversationResponse of(List<Task> sharedTasks, User self, MessageResponse lastMessage) {
        Task anyTask = sharedTasks.get(0);
        boolean selfIsCustomer = anyTask.getCustomer().getId().equals(self.getId());
        User other = selfIsCustomer ? anyTask.getAssignedWorker() : anyTask.getCustomer();

        Task latest = sharedTasks.stream()
                .max(Comparator.comparing(Task::getCreatedAt))
                .orElse(anyTask);

        return new ConversationResponse(
                "c" + anyTask.getCustomer().getId() + "-w" + anyTask.getAssignedWorker().getId(),
                other.getId(),
                TaskPartyResponse.from(other),
                latest.getTitle(),
                latest.getCategory(),
                latest.getStatus().name(),
                sharedTasks.size(),
                sharedTasks.stream().map(Task::getId).toList(),
                lastMessage
        );
    }
}
