package com.sewasathi.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The @Size caps mirror the columns on {@link com.sewasathi.entity.Task}. Without them an
 * over-length title passed bean validation and only failed at the database, which surfaced
 * as a 500 rather than a field error the customer could act on.
 *
 * <p>Rules that span two fields ({@code hourlyRate} against {@code budget}) or need a value
 * list (category, time preference) are enforced in
 * {@link com.sewasathi.service.TaskService#createTask}.
 */
@Getter
@Setter
public class CreateTaskRequest {

    @NotBlank(message = "{validation.task.title.required}")
    @Size(min = 5, max = 150, message = "{validation.task.title.length}")
    private String title;

    @NotBlank(message = "{validation.task.category.required}")
    @Size(max = 60, message = "{validation.task.category.invalid}")
    private String category;

    @NotBlank(message = "{validation.task.description.required}")
    @Size(min = 20, max = 2000, message = "{validation.task.description.length}")
    private String description;

    @NotBlank(message = "{validation.task.city.required}")
    @Size(max = 60, message = "{validation.task.city.tooLong}")
    private String city;

    @NotBlank(message = "{validation.task.location.required}")
    @Size(max = 100, message = "{validation.task.location.tooLong}")
    private String location;

    // The column is precision 10 / scale 2, so @Digits keeps anything that would overflow it
    // - or carry a third decimal - on the 400 path instead of the 500 one.
    @NotNull(message = "{validation.task.budget.required}")
    @Positive(message = "{validation.task.budget.range}")
    @DecimalMin(value = "100.00", message = "{validation.task.budget.range}")
    @DecimalMax(value = "1000000.00", message = "{validation.task.budget.range}")
    @Digits(integer = 7, fraction = 2, message = "{validation.task.budget.invalid}")
    private BigDecimal budget;

    @Positive(message = "{validation.task.hourlyRate.range}")
    @DecimalMin(value = "50.00", message = "{validation.task.hourlyRate.range}")
    @DecimalMax(value = "100000.00", message = "{validation.task.hourlyRate.range}")
    @Digits(integer = 6, fraction = 2, message = "{validation.task.hourlyRate.invalid}")
    private BigDecimal hourlyRate;

    @FutureOrPresent(message = "{validation.task.dueDate.past}")
    private LocalDate dueDate;

    @Size(max = 20, message = "{validation.task.timePreference.invalid}")
    private String timePreference;
}
