package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * A customer review quoted on the public pages. {@code author} is already masked to a first
 * name and surname initial - the audience is anonymous visitors, and leaving a review is not
 * consent to publish a full name.
 */
@Getter
@AllArgsConstructor
public class PublicTestimonialResponse {

    /** What the customer wrote. */
    private String quote;

    /** The reviewer as "Sita S." - never the stored full name. */
    private String author;

    /** City of the task being reviewed; null when it was not recorded. */
    private String location;

    private int rating;

    private LocalDateTime createdAt;
}
