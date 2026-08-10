package com.sewasathi.dto.response;

import lombok.Getter;

import java.math.BigDecimal;

/**
 * One entry of a "top N" list on the analytics dashboard - a service category or a city,
 * with how many tasks it accounts for and what they were worth.
 */
@Getter
public class AnalyticsBreakdownRow {

    private final String label;
    private final long taskCount;
    private final BigDecimal totalValue;

    /** From a JPQL constructor expression: the sum is null when every budget in the group is. */
    public AnalyticsBreakdownRow(String label, Long taskCount, BigDecimal totalValue) {
        this.label = label != null ? label : "Unspecified";
        this.taskCount = taskCount != null ? taskCount : 0L;
        this.totalValue = totalValue != null ? totalValue : BigDecimal.ZERO;
    }
}
