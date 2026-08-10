package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * The live figures behind the public marketing pages. Every number is counted from the database
 * and published as it stands, including zero. {@code ratingAverage} and {@code satisfactionRate}
 * are boxed: an empty review table has no average, which is a different claim from zero.
 */
@Getter
@AllArgsConstructor
public class PublicStatsResponse {

    /** Approved, unsuspended workers - the ones a customer could actually hire today. */
    private long verifiedWorkers;

    /** Registered customer accounts. */
    private long customers;

    /** Every task ever posted, whatever became of it. */
    private long tasksPosted;

    /** Tasks that reached COMPLETED. */
    private long tasksCompleted;

    /** Tasks still open for a worker to claim. */
    private long openTasks;

    /** Reviews customers have left. */
    private long reviewCount;

    /** Mean review score out of 5, or null when there are no reviews. */
    private Double ratingAverage;

    /** Share of reviews scoring 4 or better, as a whole percent; null when there are no reviews. */
    private Integer satisfactionRate;

    /** How many distinct cities have had a task posted in them. */
    private long citiesCovered;

    /** Those cities by name. */
    private List<String> cityNames;

    /** Size of the service catalogue in {@link com.sewasathi.service.ServiceCategories}. */
    private int categoriesOffered;
}
