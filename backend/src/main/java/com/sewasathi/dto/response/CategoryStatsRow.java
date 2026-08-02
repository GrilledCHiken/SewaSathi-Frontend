package com.sewasathi.dto.response;

import lombok.Getter;

/**
 * Task volume for one service category, across the whole history rather than a window -
 * the marketing pages describe the platform as it stands, not a reporting period.
 *
 * <p>Only categories that have been used at all appear in the query result. The catalogue
 * itself comes from {@link com.sewasathi.service.ServiceCategories}, so an unused category
 * still reaches the client, carrying zeroes.
 */
@Getter
public class CategoryStatsRow {

    private final String category;
    private final long taskCount;
    private final long completedCount;

    /** Built from a JPQL constructor expression, so every count arrives boxed and possibly null. */
    public CategoryStatsRow(String category, Long taskCount, Long completedCount) {
        this.category = category;
        this.taskCount = taskCount != null ? taskCount : 0L;
        this.completedCount = completedCount != null ? completedCount : 0L;
    }
}
