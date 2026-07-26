package com.sewasathi.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The Base64-encoded JSON eSewa appends to our success URL as {@code ?data=...}.
 * Amounts arrive as strings because eSewa sometimes formats them with grouping
 * commas ({@code "1,000.0"}), which would break numeric binding.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EsewaCallbackPayload(
        @JsonProperty("transaction_code") String transactionCode,
        @JsonProperty("status") String status,
        @JsonProperty("total_amount") String totalAmount,
        @JsonProperty("transaction_uuid") String transactionUuid,
        @JsonProperty("product_code") String productCode,
        @JsonProperty("signed_field_names") String signedFieldNames,
        @JsonProperty("signature") String signature
) {
}
