package com.sewasathi.dto.report;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * One row of the worker-performance report. Jobs completed and the rating average come from the
 * denormalised counters on {@code WorkerProfile}: recomputing them would join tasks and reviews
 * in one query, which multiplies rows and inflates both totals.
 */
@Getter
@AllArgsConstructor
public class WorkerPerformanceRow {

    private final String workerName;
    private final String email;
    private final String location;
    private final Integer jobsCompleted;
    private final BigDecimal averageRating;
    private final Integer ratingCount;
    /** Value of the tasks this worker was assigned that customers actually paid for. */
    private final BigDecimal totalEarned;

    public String getLocationOrBlank() {
        return location != null ? location : "";
    }

    public BigDecimal getTotalEarnedOrZero() {
        return totalEarned != null ? totalEarned : BigDecimal.ZERO;
    }
}
