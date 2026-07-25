package com.sewasathi.dto.response;

import com.sewasathi.entity.Review;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private int rating;
    private String comment;
    private TaskPartyResponse customer;
    private TaskPartyResponse worker;
    private LocalDateTime createdAt;

    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getTask().getId(),
                review.getTask().getTitle(),
                review.getRating(),
                review.getComment(),
                TaskPartyResponse.from(review.getCustomer()),
                TaskPartyResponse.from(review.getWorker()),
                review.getCreatedAt()
        );
    }
}
