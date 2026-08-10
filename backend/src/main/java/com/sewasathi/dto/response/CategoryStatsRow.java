package com.sewasathi.dto.response;

import lombok.Getter;

/**
 * Task volume for one service category, across the whole history rather than a window. Only
 * used categories appear in the query result; the catalogue comes from
 * {@link com.sewasathi.service.ServiceCategories}, so unused ones reach the client as zeroes.
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
