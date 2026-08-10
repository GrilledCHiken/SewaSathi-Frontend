package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An unclaimed task shown to visitors. Deliberately anonymous - no customer, no task id, no
 * street address - so an unauthenticated caller cannot enumerate who posted what.
 */
@Getter
@AllArgsConstructor
public class PublicOpenTaskResponse {

    private String title;
    private String category;

    /** City only - the precise location stays behind authentication. */
    private String city;

    private BigDecimal budget;
    private LocalDateTime postedAt;
}
