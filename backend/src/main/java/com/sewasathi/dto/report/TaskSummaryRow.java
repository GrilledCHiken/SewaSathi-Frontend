package com.sewasathi.dto.report;

import com.sewasathi.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * One row of the task-volume report: how many tasks of a given category ended in a given
 * status, and what they were worth.
 */
@Getter
@AllArgsConstructor
public class TaskSummaryRow {

    private final String category;
    private final TaskStatus status;
    private final Long taskCount;
    private final BigDecimal totalBudget;

    public String getStatusName() {
        return status != null ? status.name() : "";
    }

    /** Guards the template against a null sum, which an all-null budget group would give. */
    public BigDecimal getTotalBudgetOrZero() {
        return totalBudget != null ? totalBudget : BigDecimal.ZERO;
    }
}
