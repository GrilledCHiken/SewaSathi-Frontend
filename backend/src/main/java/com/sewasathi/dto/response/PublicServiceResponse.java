package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * One service category as the public catalogue presents it.
 *
 * <p>Every category in {@link com.sewasathi.service.ServiceCategories} gets a row, even one
 * nobody has booked yet - the catalogue describes what can be requested, not only what has
 * been. Such a row carries zero counts and a null rating.
 *
 * <p>{@code startingRate} is the lowest hourly rate among workers advertising the skill, so the
 * "starting from" line on the card is a price someone is actually charging. It is null when no
 * worker lists the skill or none has set a rate.
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
