package com.sewasathi.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Reply from Khalti's {@code /epayment/lookup/} API — the only authority on whether
 * a payment happened. Khalti does not sign its redirect, so unlike eSewa there is
 * nothing in the browser's hands worth trusting.
 *
 * <p>{@code status} is one of Completed, Pending, Refunded, Expired, User canceled,
 * Partially Refunded. Only Completed means the money arrived.
 *
 * <p>{@code totalAmount} is in paisa.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KhaltiLookupResponse(
        @JsonProperty("pidx") String pidx,
        @JsonProperty("total_amount") Long totalAmount,
        @JsonProperty("status") String status,
        @JsonProperty("transaction_id") String transactionId,
        @JsonProperty("fee") Long fee,
        @JsonProperty("refunded") Boolean refunded
) {
    public static final String COMPLETED = "Completed";

    public boolean isCompleted() {
        return COMPLETED.equalsIgnoreCase(status);
    }
}
