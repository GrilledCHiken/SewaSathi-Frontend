package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An unclaimed task, shown to visitors as evidence that there is work available.
 *
 * <p>Deliberately anonymous: no customer, no task id, no street address. It is a sample of
 * demand, not a way for an unauthenticated caller to enumerate who posted what.
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
