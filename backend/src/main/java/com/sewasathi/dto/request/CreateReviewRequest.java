package com.sewasathi.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateReviewRequest {

    @NotNull
    private Long taskId;

    @Min(1)
    @Max(5)
    private int rating;

    @Size(max = 1000)
    private String comment;
}
