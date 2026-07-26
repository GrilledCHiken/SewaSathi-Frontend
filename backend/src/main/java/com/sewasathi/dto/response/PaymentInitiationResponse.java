package com.sewasathi.dto.response;

import com.sewasathi.entity.PaymentProvider;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Everything the browser needs to hand the customer over to the gateway. The two
 * providers want to be entered differently, so exactly one of these is filled in:
 *
 * <ul>
 *   <li>eSewa only accepts a form-encoded POST, so the frontend renders
 *       {@link #fields} as hidden inputs and submits them to {@link #formUrl}.</li>
 *   <li>Khalti hands back a ready-made link, so the frontend just navigates to
 *       {@link #redirectUrl}.</li>
 * </ul>
 */
@Getter
@AllArgsConstructor
public class PaymentInitiationResponse {
    private String transactionUuid;
    private PaymentProvider provider;
    private BigDecimal amount;
    private BigDecimal taskTotal;
    private String formUrl;
    private Map<String, String> fields;
    /** Set for Khalti; null for eSewa, which is entered by form POST. */
    private String redirectUrl;
}
