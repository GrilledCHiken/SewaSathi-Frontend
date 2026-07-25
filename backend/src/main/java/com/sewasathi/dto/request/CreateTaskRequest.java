package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class CreateTaskRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String category;

    @NotBlank
    private String description;

    @NotBlank
    private String city;

    @NotBlank
    private String location;

    @NotNull
    @Positive
    private BigDecimal budget;

    private BigDecimal hourlyRate;

    private LocalDate dueDate;

    private String timePreference;
}
