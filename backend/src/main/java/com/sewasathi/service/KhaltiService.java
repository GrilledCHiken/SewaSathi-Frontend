package com.sewasathi.service;

import com.sewasathi.exception.InvalidOperationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Talks to Khalti's ePayment (KPG-2) gateway. Unlike eSewa, the payment is opened
 * server-to-server and the customer is sent to the returned {@code payment_url}. Nothing is
 * signed: the secret key never leaves the backend and the lookup API decides whether a payment
 * settled. Amounts are in <em>paisa</em> throughout Khalti's API, never rupees.
 */
@Service
public class KhaltiService {

    /** Khalti rejects anything below Rs 10, which is 1000 paisa. */
    public static final long MIN_PAISA = 1_000L;

    /**
     * Khalti documents no length limit on {@code purchase_order_name}, so free-text task
     * titles are trimmed rather than risking a 400 at checkout.
     */
    private static final int MAX_ORDER_NAME = 100;

    private static final Logger log = LoggerFactory.getLogger(KhaltiService.class);

    private final String initiateUrl;
    private final String lookupUrl;
    private final String secretKey;
    private final String websiteUrl;
    private final RestClient restClient;

    public KhaltiService(
            @Value("${app.khalti.initiate-url}") String initiateUrl,
            @Value("${app.khalti.lookup-url}") String lookupUrl,
            @Value("${app.khalti.secret-key:}") String secretKey,
            @Value("${app.frontend-url}") String websiteUrl
    ) {
        this.initiateUrl = initiateUrl;
        this.lookupUrl = lookupUrl;
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.websiteUrl = websiteUrl;
        this.restClient = RestClient.create();
    }

    /**
     * Khalti counts in paisa. Rounding here rather than at the call site keeps the opening
     * amount identical to the one compared against later.
     */
    public long toPaisa(BigDecimal rupees) {
        return rupees.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    /**
     * Opens a payment and returns the link to send the customer to.
     *
     * @param purchaseOrderId our own reference — the payment's {@code transactionUuid}
     * @param returnUrl       where Khalti drops the browser afterwards, whatever the outcome
     * @throws InvalidOperationException when Khalti will not open the payment, so the
     *                                   caller's transaction rolls back instead of leaving
     *                                   a payment row nobody can ever pay
     */
    public KhaltiInitiateResponse initiate(
            String purchaseOrderId,
            String purchaseOrderName,
            long amountInPaisa,
            String returnUrl,
            KhaltiCustomer customer
    ) {
        requireConfigured();
        if (amountInPaisa < MIN_PAISA) {
            throw new InvalidOperationException(
                    "Khalti cannot take a payment below NPR 10. Please pay with eSewa instead.");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("return_url", returnUrl);
        body.put("website_url", websiteUrl);
        body.put("amount", amountInPaisa);
        body.put("purchase_order_id", purchaseOrderId);
        body.put("purchase_order_name", trimOrderName(purchaseOrderName));
        if (customer != null) {
            body.put("customer_info", Map.of(
                    "name", nullToEmpty(customer.name()),
                    "email", nullToEmpty(customer.email()),
                    "phone", nullToEmpty(customer.phone())
            ));
        }

        KhaltiInitiateResponse response;
        try {
            response = restClient.post()
                    .uri(initiateUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Key " + secretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(KhaltiInitiateResponse.class);
        } catch (RestClientResponseException e) {
            // Khalti explains itself in the body, e.g. "Amount should be greater than Rs. 10".
            log.warn("Khalti rejected the checkout for {}: {} {}",
                    purchaseOrderId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidOperationException("Khalti could not start this payment. Please try again.");
        } catch (RestClientException e) {
            log.warn("Khalti is unreachable for {}: {}", purchaseOrderId, e.getMessage());
            throw new InvalidOperationException("Khalti is not responding right now. Please try again.");
        }

        if (response == null || response.paymentUrl() == null || response.pidx() == null) {
            log.warn("Khalti returned no payment link for {}", purchaseOrderId);
            throw new InvalidOperationException("Khalti did not return a payment link. Please try again.");
        }
        return response;
    }

    /**
     * Asks Khalti whether a payment settled. Returns null when the gateway cannot be
     * reached or refuses the lookup, so the caller can fail the payment rather than
     * blowing up with a 500.
     */
    public KhaltiLookupResponse lookup(String pidx) {
        requireConfigured();
        try {
            return restClient.post()
                    .uri(lookupUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Key " + secretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("pidx", pidx))
                    .retrieve()
                    .body(KhaltiLookupResponse.class);
        } catch (Exception e) {
            log.warn("Khalti lookup failed for {}: {}", pidx, e.getMessage());
            return null;
        }
    }

    /**
     * Only bites in production, where {@code KHALTI_SECRET_KEY} has no default. Reporting an
     * unconfigured server beats showing the customer a bare 401 from the gateway.
     */
    private void requireConfigured() {
        if (secretKey.isEmpty()) {
            throw new InvalidOperationException(
                    "Khalti payments are not configured on this server. Set app.khalti.secret-key.");
        }
    }

    private static String trimOrderName(String name) {
        String safe = name == null || name.isBlank() ? "Sewa Sathi task advance" : name.trim();
        return safe.length() <= MAX_ORDER_NAME ? safe : safe.substring(0, MAX_ORDER_NAME);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
