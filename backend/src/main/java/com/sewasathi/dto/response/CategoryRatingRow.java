package com.sewasathi.dto.response;

import lombok.Getter;

/**
 * The review score customers have given one service category.
 *
 * <p>{@code ratingAverage} stays boxed and nullable on purpose: a category nobody has reviewed
 * has no average, which is a different statement from an average of zero. The public pages
 * render the absent case as "no reviews yet" rather than as a zero-star score.
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
