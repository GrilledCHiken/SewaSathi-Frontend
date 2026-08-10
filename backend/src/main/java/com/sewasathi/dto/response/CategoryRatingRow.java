package com.sewasathi.dto.response;

import lombok.Getter;

/**
 * The review score customers have given one service category. {@code ratingAverage} stays
 * boxed: an unreviewed category has no average, which is not the same as an average of zero.
 */
@Getter
public class CategoryRatingRow {

    private final String category;
    private final Double ratingAverage;
    private final long ratingCount;

    public CategoryRatingRow(String category, Double ratingAverage, Long ratingCount) {
        this.category = category;
        this.ratingAverage = ratingAverage;
        this.ratingCount = ratingCount != null ? ratingCount : 0L;
    }
}
