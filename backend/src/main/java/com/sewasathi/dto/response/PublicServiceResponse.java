package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * One service category as the public catalogue presents it. Every category in
 * {@link com.sewasathi.service.ServiceCategories} gets a row even if nobody has booked it,
 * carrying zero counts and a null rating.
 */
@Getter
@AllArgsConstructor
public class PublicServiceResponse {

    private String name;

    /** Tasks posted under this category. */
    private long taskCount;

    /** How many of those were seen through to completion. */
    private long completedCount;

    /** Approved workers advertising this skill. */
    private long workerCount;

    /** Mean review score for tasks in this category, or null when there are none. */
    private Double ratingAverage;

    /** Reviews behind that average. */
    private long ratingCount;

    /** Lowest advertised hourly rate for the skill, or null when nobody has priced it. */
    private BigDecimal startingRate;
}
