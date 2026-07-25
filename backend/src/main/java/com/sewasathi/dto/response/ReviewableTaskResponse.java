package com.sewasathi.dto.response;

import com.sewasathi.entity.Task;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ReviewableTaskResponse {
    private Long id;
    private String title;
    private String category;
    private TaskPartyResponse worker;

    public static ReviewableTaskResponse from(Task task) {
        return new ReviewableTaskResponse(
                task.getId(),
                task.getTitle(),
                task.getCategory(),
                TaskPartyResponse.from(task.getAssignedWorker())
        );
    }
}
