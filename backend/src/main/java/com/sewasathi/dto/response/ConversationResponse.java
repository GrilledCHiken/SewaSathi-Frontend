package com.sewasathi.dto.response;

import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ConversationResponse {
    private Long taskId;
    private String taskTitle;
    private String category;
    private String taskStatus;
    private TaskPartyResponse otherParty;
    private MessageResponse lastMessage;

    public static ConversationResponse of(Task task, User self, MessageResponse lastMessage) {
        User other = task.getCustomer().getId().equals(self.getId())
                ? task.getAssignedWorker()
                : task.getCustomer();
        return new ConversationResponse(
                task.getId(),
                task.getTitle(),
                task.getCategory(),
                task.getStatus().name(),
                TaskPartyResponse.from(other),
                lastMessage
        );
    }
}
