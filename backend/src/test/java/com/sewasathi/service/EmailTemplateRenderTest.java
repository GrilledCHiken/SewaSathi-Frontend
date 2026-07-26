package com.sewasathi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Renders every transactional email template.
 *
 * <p>Template problems are invisible at compile time and, because email is sent
 * asynchronously and failures are deliberately swallowed, a broken template in production
 * would show up only as a customer never receiving their verification link. These tests
 * are the only thing standing between a typo in a fragment expression and that outcome.
 *
 * <p>The wrapper assertions matter specifically: the layout passes each body in as a
 * fragment expression, and getting that wrong tends to yield a page that renders the
 * chrome but silently drops the content (or vice versa) rather than throwing.
 */
@SpringBootTest
@ActiveProfiles("test")
class EmailTemplateRenderTest {

    @Autowired
    private SpringTemplateEngine templateEngine;

    private static final String ACTION_URL = "https://sewasathi.test/action?token=abc123";

    static Stream<org.junit.jupiter.params.provider.Arguments> templates() {
        return Stream.of(
                org.junit.jupiter.params.provider.Arguments.of("email/verification",
                        "Confirm your email address",
                        Map.of("name", "Aarya",
                                "actionUrl", ACTION_URL,
                                "expiresAt", "Aug 1, 2026 10:00")),
                org.junit.jupiter.params.provider.Arguments.of("email/password-reset",
                        "Reset your password",
                        Map.of("name", "Aarya",
                                "actionUrl", ACTION_URL,
                                "expiryMinutes", 60L)),
                org.junit.jupiter.params.provider.Arguments.of("email/otp",
                        "Your sign-in code",
                        Map.of("name", "Aarya",
                                "code", "482913",
                                "reason", "Finish signing in to your account.",
                                "expiryMinutes", 5L)),
                org.junit.jupiter.params.provider.Arguments.of("email/new-device-alert",
                        "New sign-in to your account",
                        Map.of("name", "Aarya",
                                "details", detailRows())),
                org.junit.jupiter.params.provider.Arguments.of("email/task-assigned",
                        "Your booking is confirmed",
                        Map.of("name", "Aarya",
                                "workerName", "Bikash Thapa",
                                "details", detailRows(),
                                "actionUrl", ACTION_URL)),
                org.junit.jupiter.params.provider.Arguments.of("email/payment-receipt",
                        "Payment received",
                        Map.of("name", "Aarya",
                                "details", detailRows(),
                                "actionUrl", ACTION_URL)),
                org.junit.jupiter.params.provider.Arguments.of("email/newsletter-welcome",
                        "Thanks for subscribing",
                        Map.of("actionUrl", ACTION_URL))
        );
    }

    private static Map<String, String> detailRows() {
        Map<String, String> rows = new LinkedHashMap<>();
        rows.put("Device", "Chrome on Windows");
        rows.put("Reference", "SS-1-1730000000");
        return rows;
    }

    @ParameterizedTest(name = "{0} renders")
    @MethodSource("templates")
    void rendersCompletePage(String template, String expectedHeading, Map<String, Object> model) {
        Context context = new Context();
        context.setVariables(model);

        String html = templateEngine.process(template, context);

        assertThat(html).as("%s produced no output", template).isNotBlank();

        // The wrapper actually wrapped: brand bar above, footer below.
        assertThat(html).as("%s lost the layout header", template).contains("Sathi");
        assertThat(html).as("%s lost the layout footer", template)
                .contains("trusted local services across Nepal");
        assertThat(html).as("%s did not render its heading", template).contains(expectedHeading);

        // No unresolved expressions leaked into the output. Matched as attribute patterns
        // rather than a bare "th:" substring, which would also hit the "width:0" in the
        // inline CSS.
        assertThat(html).as("%s leaked an unprocessed Thymeleaf attribute", template)
                .doesNotContainPattern("th:[a-zA-Z]+\\s*=");
        assertThat(html).as("%s leaked a raw expression", template)
                .doesNotContain("~{").doesNotContain("${");
    }

    @Test
    void verificationEmail_containsTheActivationLink() {
        Context context = new Context();
        context.setVariables(Map.of("name", "Aarya",
                "actionUrl", ACTION_URL,
                "expiresAt", "Aug 1, 2026 10:00"));

        String html = templateEngine.process("email/verification", context);

        // Both the button href and the copy/paste fallback must carry the link - this is the
        // one element of the email without which the account can never be activated.
        assertThat(html).contains("href=\"" + ACTION_URL + "\"");
        assertThat(html).contains("copy and paste this link");
        assertThat(html).contains("Aarya");
    }

    @Test
    void otpEmail_showsTheCodeAndTheAntiPhishingWarning() {
        Context context = new Context();
        context.setVariables(Map.of("name", "Aarya",
                "code", "482913",
                "reason", "Finish signing in.",
                "expiryMinutes", 5L));

        String html = templateEngine.process("email/otp", context);

        assertThat(html).contains("482913");
        assertThat(html).contains("never ask you for this code");
    }

    @Test
    void detailRows_areRenderedInOrder() {
        Context context = new Context();
        context.setVariables(Map.of("name", "Aarya", "details", detailRows()));

        String html = templateEngine.process("email/new-device-alert", context);

        assertThat(html).contains("Device").contains("Chrome on Windows");
        assertThat(html.indexOf("Device")).isLessThan(html.indexOf("Reference"));
    }
}
