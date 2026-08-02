package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * The live figures behind the public marketing pages.
 *
 * <p>Every number here is counted from the database and published as it stands, including zero.
 * The pages these feed used to carry invented totals ("50,000+ happy customers"), which is what
 * this type exists to replace - so nothing in it is rounded up, floored, or padded.
 *
 * <p>{@code ratingAverage} and {@code satisfactionRate} are boxed and may be null. An empty
 * review table has no average and no satisfaction rate; that is a different claim from zero, and
 * the client renders it as an absent value rather than as a bad score.
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

    /** Those cities by name, so a page can list real ones instead of a stock sample. */
    private List<String> cityNames;

    /** Size of the service catalogue in {@link com.sewasathi.service.ServiceCategories}. */
    private int categoriesOffered;
}
