package com.sewasathi.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Khalti's answer to {@code /epayment/initiate/}. The {@code pidx} is the handle
 * everything afterwards keys off — it is what comes back on the redirect and what
 * the lookup API expects — so we store it against the payment before redirecting.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KhaltiInitiateResponse(
        @JsonProperty("pidx") String pidx,
        @JsonProperty("payment_url") String paymentUrl,
        @JsonProperty("expires_at") String expiresAt,
        @JsonProperty("expires_in") Integer expiresIn
) {
}
