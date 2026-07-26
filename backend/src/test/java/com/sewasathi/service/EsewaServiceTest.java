package com.sewasathi.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EsewaServiceTest {

    /** eSewa's published UAT secret. */
    private static final String UAT_SECRET = "8gBm/:&EnhH.1/q";

    private EsewaService esewaService;

    @BeforeEach
    void setUp() {
        esewaService = new EsewaService(
                "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
                "https://rc.esewa.com.np/api/epay/transaction/status/",
                "EPAYTEST",
                UAT_SECRET,
                JsonMapper.builder().build()
        );
    }

    /**
     * The one test that matters most: a wrong signed-string format fails silently at
     * the gateway with no useful error. This pins it to eSewa's documented sample.
     */
    @Test
    void sign_reproducesEsewasPublishedSample() {
        Map<String, String> values = Map.of(
                "total_amount", "110",
                "transaction_uuid", "241028",
                "product_code", "EPAYTEST"
        );

        String signature = esewaService.sign(EsewaService.FORM_SIGNED_FIELDS, values);

        assertThat(signature).isEqualTo("i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=");
    }

    @Test
    void buildFormFields_carriesEverySewaFieldAndAMatchingSignature() {
        Map<String, String> fields = esewaService.buildFormFields(
                "SS-7-1730000000000",
                "250",
                "http://localhost:5174/dashboard/payments/esewa/success",
                "http://localhost:5174/dashboard/payments/esewa/failure/7"
        );

        assertThat(fields).containsKeys("amount", "tax_amount", "total_amount", "transaction_uuid",
                "product_code", "product_service_charge", "product_delivery_charge",
                "success_url", "failure_url", "signed_field_names", "signature");
        assertThat(fields.get("total_amount")).isEqualTo("250");
        assertThat(fields.get("amount")).isEqualTo("250");
        assertThat(fields.get("product_code")).isEqualTo("EPAYTEST");
        assertThat(fields.get("signed_field_names")).isEqualTo(EsewaService.FORM_SIGNED_FIELDS);
        assertThat(fields.get("signature"))
                .isEqualTo(esewaService.sign(EsewaService.FORM_SIGNED_FIELDS, fields));
    }

    @Test
    void formatAmount_rendersOneCanonicalStringPerAmount() {
        // eSewa compares amounts as strings, so 250 and 250.00 must not both appear.
        assertThat(esewaService.formatAmount(new BigDecimal("250"))).isEqualTo("250");
        assertThat(esewaService.formatAmount(new BigDecimal("250.00"))).isEqualTo("250");
        assertThat(esewaService.formatAmount(new BigDecimal("250.5"))).isEqualTo("250.5");
        assertThat(esewaService.formatAmount(new BigDecimal("249.999"))).isEqualTo("250");
    }

    @Test
    void decodeCallback_readsTheBase64PayloadEsewaRedirectsWith() {
        EsewaCallbackPayload payload = esewaService.decodeCallback(encode("""
                {"transaction_code":"000AWEO","status":"COMPLETE","total_amount":1000.0,
                 "transaction_uuid":"SS-7-1730000000000","product_code":"EPAYTEST",
                 "signed_field_names":"transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
                 "signature":"62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA="}
                """));

        assertThat(payload.transactionCode()).isEqualTo("000AWEO");
        assertThat(payload.status()).isEqualTo("COMPLETE");
        assertThat(payload.transactionUuid()).isEqualTo("SS-7-1730000000000");
        assertThat(payload.totalAmount()).isEqualTo("1000.0");
    }

    @Test
    void verifyCallbackSignature_acceptsAPayloadSignedWithTheSharedSecret() {
        EsewaCallbackPayload signed = signedCallback("COMPLETE", "250");

        assertThat(esewaService.verifyCallbackSignature(signed)).isTrue();
    }

    @Test
    void verifyCallbackSignature_rejectsATamperedAmount() {
        EsewaCallbackPayload signed = signedCallback("COMPLETE", "250");
        EsewaCallbackPayload tampered = new EsewaCallbackPayload(
                signed.transactionCode(), signed.status(), "25",
                signed.transactionUuid(), signed.productCode(),
                signed.signedFieldNames(), signed.signature()
        );

        assertThat(esewaService.verifyCallbackSignature(tampered)).isFalse();
    }

    private EsewaCallbackPayload signedCallback(String status, String totalAmount) {
        String signedFields =
                "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
        Map<String, String> values = Map.of(
                "transaction_code", "000AWEO",
                "status", status,
                "total_amount", totalAmount,
                "transaction_uuid", "SS-7-1730000000000",
                "product_code", "EPAYTEST",
                "signed_field_names", signedFields
        );
        return new EsewaCallbackPayload(
                "000AWEO", status, totalAmount, "SS-7-1730000000000", "EPAYTEST",
                signedFields, esewaService.sign(signedFields, values)
        );
    }

    private static String encode(String json) {
        return Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }
}
