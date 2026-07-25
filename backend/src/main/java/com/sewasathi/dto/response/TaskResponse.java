package com.sewasathi.dto.response;

import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class TaskResponse {
    private Long id;
    private String title;
    private String category;
    private String description;
    private String city;
    private String location;
    private BigDecimal budget;
    private BigDecimal hourlyRate;
    private LocalDate dueDate;
    private String timePreference;
    private TaskStatus status;
    private TaskPartyResponse customer;
    private TaskPartyResponse assignedWorker;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getCategory(),
                task.getDescription(),
                task.getCity(),
                task.getLocation(),
                task.getBudget(),
                task.getHourlyRate(),
                task.getDueDate(),
                task.getTimePreference(),
                task.getStatus(),
                TaskPartyResponse.from(task.getCustomer()),
                TaskPartyResponse.from(task.getAssignedWorker()),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
