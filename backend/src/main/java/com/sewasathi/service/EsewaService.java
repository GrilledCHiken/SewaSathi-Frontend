package com.sewasathi.service;

import com.sewasathi.exception.InvalidOperationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Talks to eSewa's ePay v2 gateway: builds the signed checkout form, validates the redirect
 * payload and confirms transactions server-to-server. Signing is HMAC-SHA256 over the fields
 * named by {@code signed_field_names}, rendered {@code name=value}, comma-joined, Base64'd -
 * for the checkout form, {@code total_amount=<t>,transaction_uuid=<u>,product_code=<p>}.
 */
@Service
public class EsewaService {

    /** eSewa requires these three fields, in this order, for the checkout form. */
    public static final String FORM_SIGNED_FIELDS = "total_amount,transaction_uuid,product_code";

    private static final Logger log = LoggerFactory.getLogger(EsewaService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String formUrl;
    private final String statusUrl;
    private final String merchantCode;
    private final String secretKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public EsewaService(
            @Value("${app.esewa.form-url}") String formUrl,
            @Value("${app.esewa.status-url}") String statusUrl,
            @Value("${app.esewa.merchant-code}") String merchantCode,
            @Value("${app.esewa.secret-key}") String secretKey,
            ObjectMapper objectMapper
    ) {
        this.formUrl = formUrl;
        this.statusUrl = statusUrl;
        this.merchantCode = merchantCode;
        this.secretKey = secretKey;
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
    }

    public String getFormUrl() {
        return formUrl;
    }

    public String getMerchantCode() {
        return merchantCode;
    }

    /**
     * Renders an amount one way for the form field, signature and status lookup alike. eSewa
     * compares these as strings, so {@code 250} and {@code 250.00} are different to it.
     */
    public String formatAmount(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    /**
     * Every field eSewa's checkout form expects, ready to be POSTed by the browser.
     * The advance carries no tax or delivery charge, so total == amount.
     */
    public Map<String, String> buildFormFields(
            String transactionUuid,
            String totalAmount,
            String successUrl,
            String failureUrl
    ) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("amount", totalAmount);
        fields.put("tax_amount", "0");
        fields.put("total_amount", totalAmount);
        fields.put("transaction_uuid", transactionUuid);
        fields.put("product_code", merchantCode);
        fields.put("product_service_charge", "0");
        fields.put("product_delivery_charge", "0");
        fields.put("success_url", successUrl);
        fields.put("failure_url", failureUrl);
        fields.put("signed_field_names", FORM_SIGNED_FIELDS);
        fields.put("signature", sign(FORM_SIGNED_FIELDS, fields));
        return fields;
    }

    /** Base64 HMAC-SHA256 over the named fields, in the order they are named. */
    public String sign(String signedFieldNames, Map<String, String> values) {
        StringBuilder message = new StringBuilder();
        for (String field : signedFieldNames.split(",")) {
            String name = field.trim();
            if (!message.isEmpty()) {
                message.append(',');
            }
            message.append(name).append('=').append(values.getOrDefault(name, ""));
        }
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getEncoder()
                    .encodeToString(mac.doFinal(message.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign the eSewa request", e);
        }
    }

    /** Decodes the {@code ?data=} blob eSewa hands back on the success redirect. */
    public EsewaCallbackPayload decodeCallback(String encodedData) {
        try {
            byte[] json = Base64.getDecoder().decode(encodedData.trim());
            return objectMapper.readValue(json, EsewaCallbackPayload.class);
        } catch (Exception e) {
            throw new InvalidOperationException("The payment response from eSewa could not be read");
        }
    }

    public boolean verifyCallbackSignature(EsewaCallbackPayload payload) {
        if (payload.signature() == null || payload.signedFieldNames() == null) {
            return false;
        }
        Map<String, String> values = new LinkedHashMap<>();
        values.put("transaction_code", nullToEmpty(payload.transactionCode()));
        values.put("status", nullToEmpty(payload.status()));
        values.put("total_amount", nullToEmpty(payload.totalAmount()));
        values.put("transaction_uuid", nullToEmpty(payload.transactionUuid()));
        values.put("product_code", nullToEmpty(payload.productCode()));
        values.put("signed_field_names", payload.signedFieldNames());

        String expected = sign(payload.signedFieldNames(), values);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                payload.signature().getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Asks eSewa directly whether a transaction settled. Returns null when the
     * gateway is unreachable, so the caller can fail the payment rather than
     * blowing up with a 500.
     */
    public EsewaStatusResponse checkStatus(String transactionUuid, String totalAmount) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(statusUrl)
                    .queryParam("product_code", merchantCode)
                    .queryParam("total_amount", totalAmount)
                    .queryParam("transaction_uuid", transactionUuid)
                    .build(true)
                    .toUri();
            return restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(EsewaStatusResponse.class);
        } catch (Exception e) {
            log.warn("eSewa status check failed for {}: {}", transactionUuid, e.getMessage());
            return null;
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
