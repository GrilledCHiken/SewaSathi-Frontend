package com.sewasathi.dto.response;

import lombok.Getter;

import java.time.LocalDateTime;

/**
 * A review as it leaves the database, still carrying the reviewer's full name.
 *
 * <p>This type is internal to {@link com.sewasathi.service.PublicDataService}, which masks the
 * name before building the {@link PublicTestimonialResponse} that anonymous callers receive.
 * Keeping the two apart is what stops the unmasked name from reaching the wire by accident.
 */
@Getter
public class TestimonialRow {

    private final String comment;
    private final String customerName;
    private final String city;
    private final int rating;
    private final LocalDateTime createdAt;

    public TestimonialRow(String comment, String customerName, String city, Integer rating, LocalDateTime createdAt) {
        this.comment = comment;
        this.customerName = customerName;
        this.city = city;
        this.rating = rating != null ? rating : 0;
        this.createdAt = createdAt;
    }
}
