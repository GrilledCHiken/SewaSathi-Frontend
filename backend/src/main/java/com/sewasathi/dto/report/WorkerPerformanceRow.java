package com.sewasathi.dto.report;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * One row of the worker-performance report.
 *
 * <p>Jobs completed and the rating average are read from the denormalised counters on
 * {@code WorkerProfile} rather than recomputed here: they are already maintained as reviews
 * land, and recomputing them would mean joining tasks and reviews in one query, which
 * multiplies the rows and inflates both totals.
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
