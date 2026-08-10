package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * The live figures behind the admin analytics dashboard, all over the same window.
 * {@code from}/{@code to} echo the window the server actually applied, so the SPA labels the
 * numbers with the range they came from rather than the current input values.
 */
@Getter
@AllArgsConstructor
public class AdminAnalyticsResponse {

    private LocalDate from;
    private LocalDate to;

    /** Tasks posted in the window, whatever their outcome. */
    private long totalTasks;

    /** Gross value of the bookings confirmed by a settled payment. */
    private BigDecimal totalRevenue;

    /** The advance the platform collected on those bookings. */
    private BigDecimal platformFees;

    /** Payments that settled - what the two money figures are drawn from. */
    private long paidBookings;

    /** Accounts registered in the window, in any role. */
    private long newUsers;

    private List<AnalyticsBreakdownRow> topCategories;
    private List<AnalyticsBreakdownRow> topLocations;
}
