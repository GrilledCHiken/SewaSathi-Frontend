package com.sewasathi.service;

import com.sewasathi.exception.InvalidOperationException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Khalti has no signature to get wrong, so what silently breaks an integration
 * instead is the wire format: the {@code Key <secret>} authorisation scheme and
 * amounts in paisa. These run against a loopback stub so both are pinned.
 */
class KhaltiServiceTest {

    private static final String SECRET = "live_secret_key_testonly";
    private static final KhaltiCustomer CUSTOMER =
            new KhaltiCustomer("Customer One", "customer@example.com", "9800000001");

    private record Recorded(String path, String authorization, String contentType, String body) {
    }

    private HttpServer server;
    private final List<Recorded> received = new ArrayList<>();
    private final JsonMapper json = JsonMapper.builder().build();

    private int responseStatus = 200;
    private String responseBody = "{}";

    private KhaltiService khaltiService;

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/", exchange -> {
            received.add(new Recorded(
                    exchange.getRequestURI().getPath(),
                    exchange.getRequestHeaders().getFirst("Authorization"),
                    exchange.getRequestHeaders().getFirst("Content-Type"),
                    new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)
            ));
            byte[] out = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(responseStatus, out.length);
            try (OutputStream body = exchange.getResponseBody()) {
                body.write(out);
            }
        });
        server.start();

        khaltiService = serviceWithSecret(SECRET);
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private KhaltiService serviceWithSecret(String secret) {
        String base = "http://localhost:" + server.getAddress().getPort();
        return new KhaltiService(
                base + "/api/v2/epayment/initiate/",
                base + "/api/v2/epayment/lookup/",
                secret,
                "http://localhost:5174"
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> lastBody() {
        return json.readValue(received.getLast().body(), Map.class);
    }

    // --- amounts ---

    @Test
    void toPaisa_convertsRupeesToTheOnlyUnitKhaltiUnderstands() {
        assertThat(khaltiService.toPaisa(new BigDecimal("250.00"))).isEqualTo(25_000L);
        assertThat(khaltiService.toPaisa(new BigDecimal("250"))).isEqualTo(25_000L);
        assertThat(khaltiService.toPaisa(new BigDecimal("199.90"))).isEqualTo(19_990L);
        assertThat(khaltiService.toPaisa(new BigDecimal("123.456"))).isEqualTo(12_346L);
    }

    // --- initiate ---

    @Test
    void initiate_authorisesWithTheKeySchemeAndSendsPaisa() {
        responseBody = """
                {"pidx":"bZQLD9wRVWo4CdESSfuSsB",
                 "payment_url":"https://test-pay.khalti.com/?pidx=bZQLD9wRVWo4CdESSfuSsB",
                 "expires_at":"2026-07-26T16:26:16.471649+05:45","expires_in":1800}
                """;

        KhaltiInitiateResponse response = khaltiService.initiate(
                "SS-100-1730000000000",
                "Deep clean",
                25_000L,
                "http://localhost:5174/dashboard/payments/khalti/callback",
                CUSTOMER
        );

        assertThat(response.pidx()).isEqualTo("bZQLD9wRVWo4CdESSfuSsB");
        assertThat(response.paymentUrl()).isEqualTo("https://test-pay.khalti.com/?pidx=bZQLD9wRVWo4CdESSfuSsB");
        assertThat(response.expiresIn()).isEqualTo(1800);

        Recorded request = received.getLast();
        assertThat(request.path()).isEqualTo("/api/v2/epayment/initiate/");
        assertThat(request.authorization()).isEqualTo("Key " + SECRET);
        assertThat(request.contentType()).startsWith("application/json");

        Map<String, Object> body = lastBody();
        assertThat(body.get("amount")).isEqualTo(25_000);
        assertThat(body.get("purchase_order_id")).isEqualTo("SS-100-1730000000000");
        assertThat(body.get("purchase_order_name")).isEqualTo("Deep clean");
        assertThat(body.get("website_url")).isEqualTo("http://localhost:5174");
        assertThat(body.get("return_url"))
                .isEqualTo("http://localhost:5174/dashboard/payments/khalti/callback");
        assertThat(body.get("customer_info")).isEqualTo(Map.of(
                "name", "Customer One",
                "email", "customer@example.com",
                "phone", "9800000001"
        ));
    }

    @Test
    void initiate_trimsALongTaskTitleRatherThanRiskingA400() {
        responseBody = """
                {"pidx":"p1","payment_url":"https://test-pay.khalti.com/?pidx=p1"}
                """;

        khaltiService.initiate("SS-1-1", "x".repeat(300), 25_000L, "http://localhost:5174/r", CUSTOMER);

        assertThat((String) lastBody().get("purchase_order_name")).hasSize(100);
    }

    @Test
    void initiate_belowKhaltisMinimum_neverReachesTheGateway() {
        assertThatThrownBy(() ->
                khaltiService.initiate("SS-1-1", "Tiny job", 999L, "http://localhost:5174/r", CUSTOMER))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("NPR 10");

        assertThat(received).isEmpty();
    }

    @Test
    void initiate_whenKhaltiRejectsTheRequest_raisesAReadableError() {
        responseStatus = 400;
        responseBody = """
                {"amount":["Amount should be greater than Rs. 10, that is 1000 paisa."]}
                """;

        assertThatThrownBy(() ->
                khaltiService.initiate("SS-1-1", "Deep clean", 25_000L, "http://localhost:5174/r", CUSTOMER))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("could not start this payment");
    }

    @Test
    void initiate_whenKhaltiAnswersWithoutAPaymentLink_isTreatedAsAFailure() {
        responseBody = "{\"pidx\":\"p1\"}";

        assertThatThrownBy(() ->
                khaltiService.initiate("SS-1-1", "Deep clean", 25_000L, "http://localhost:5174/r", CUSTOMER))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("did not return a payment link");
    }

    @Test
    void initiate_withoutASecretKey_saysSoInsteadOfLettingKhaltiAnswer401() {
        KhaltiService unconfigured = serviceWithSecret("");

        assertThatThrownBy(() ->
                unconfigured.initiate("SS-1-1", "Deep clean", 25_000L, "http://localhost:5174/r", CUSTOMER))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("not configured");

        assertThat(received).isEmpty();
    }

    // --- lookup ---

    @Test
    void lookup_readsTheStatusPayloadKhaltiReturns() {
        responseBody = """
                {"pidx":"HT6o6PEZRWFJ5ygavzHWd5","total_amount":25000,"status":"Completed",
                 "transaction_id":"GFq9PFS7b2iYvL8Lir9oXe","fee":0,"refunded":false}
                """;

        KhaltiLookupResponse lookup = khaltiService.lookup("HT6o6PEZRWFJ5ygavzHWd5");

        assertThat(lookup).isNotNull();
        assertThat(lookup.isCompleted()).isTrue();
        assertThat(lookup.totalAmount()).isEqualTo(25_000L);
        assertThat(lookup.transactionId()).isEqualTo("GFq9PFS7b2iYvL8Lir9oXe");
        assertThat(lookup.refunded()).isFalse();

        Recorded request = received.getLast();
        assertThat(request.path()).isEqualTo("/api/v2/epayment/lookup/");
        assertThat(request.authorization()).isEqualTo("Key " + SECRET);
        assertThat(lastBody()).containsEntry("pidx", "HT6o6PEZRWFJ5ygavzHWd5");
    }

    @Test
    void lookup_treatsEveryOtherStatusAsUnsettled() {
        for (String status : List.of("Pending", "Expired", "User canceled", "Refunded",
                "Partially Refunded")) {
            responseBody = "{\"pidx\":\"p1\",\"total_amount\":25000,\"status\":\"" + status + "\"}";

            KhaltiLookupResponse lookup = khaltiService.lookup("p1");

            assertThat(lookup).isNotNull();
            assertThat(lookup.isCompleted()).as(status).isFalse();
        }
    }

    @Test
    void lookup_whenTheGatewayFails_returnsNullSoTheCallerCanFailThePayment() {
        responseStatus = 500;
        responseBody = "{\"detail\":\"Server error\"}";

        assertThat(khaltiService.lookup("p1")).isNull();
    }
}
