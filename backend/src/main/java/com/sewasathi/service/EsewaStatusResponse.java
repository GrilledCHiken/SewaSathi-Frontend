package com.sewasathi.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Reply from eSewa's transaction status API. This is the authoritative word on
 * whether a payment happened — unlike the browser redirect, it cannot be forged
 * by whoever controls the customer's browser.
 *
 * <p>{@code status} is one of PENDING, COMPLETE, FULL_REFUND, PARTIAL_REFUND,
 * AMBIGUOUS, NOT_FOUND, CANCELED.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EsewaStatusResponse(
        @JsonProperty("product_code") String productCode,
        @JsonProperty("transaction_uuid") String transactionUuid,
        @JsonProperty("total_amount") String totalAmount,
        @JsonProperty("status") String status,
        @JsonProperty("ref_id") String refId
) {
    public static final String COMPLETE = "COMPLETE";

    public boolean isComplete() {
        return COMPLETE.equalsIgnoreCase(status);
    }
}
