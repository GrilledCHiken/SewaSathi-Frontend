package com.sewasathi.dto.response;

import lombok.Getter;

import java.math.BigDecimal;

/**
 * Money settled through the gateways over a window: the gross value of the bookings the
 * payments confirmed, and the advance the platform actually collected on them.
 */
@Getter
public class RevenueTotals {

    private final BigDecimal grossValue;
    private final BigDecimal platformFees;
    private final long paymentCount;

    /**
     * An aggregate-only query still returns a row when nothing matched, with null sums -
     * hence the normalising, so an empty window reads as zero rather than as missing data.
     */
    public RevenueTotals(BigDecimal grossValue, BigDecimal platformFees, Long paymentCount) {
        this.grossValue = grossValue != null ? grossValue : BigDecimal.ZERO;
        this.platformFees = platformFees != null ? platformFees : BigDecimal.ZERO;
        this.paymentCount = paymentCount != null ? paymentCount : 0L;
    }
}
