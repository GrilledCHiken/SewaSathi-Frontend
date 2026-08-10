package com.sewasathi.service;

import com.sewasathi.exception.EmailDeliveryException;

import java.util.Map;

/**
 * Outbound email. Two implementations exist and exactly one is active at a time,
 * selected by the {@code app.mail.enabled} property:
 *
 * <ul>
 *   <li>{@link SmtpEmailService} - real delivery through JavaMail/SMTP ({@code app.mail.enabled=true})</li>
 *   <li>{@link ConsoleEmailService} - logs instead of sending, so local development and the
 *       test suite need no mail credentials (the default)</li>
 * </ul>
 *
 * <p>Sending is synchronous and failures are reported, not swallowed - signup depends on the
 * message arriving. Callers that do not care about delivery catch
 * {@link EmailDeliveryException} themselves.
 */
public interface EmailService {

    /** Plain-text email. Kept for simple notices that do not warrant a template. */
    void send(String to, String subject, String body);

    /**
     * Renders {@code template} (a Thymeleaf template under {@code templates/email/}, named
     * without the extension, e.g. {@code "email/otp"}) against {@code model} and sends the
     * result as HTML.
     *
     * @throws EmailDeliveryException if the message could not be handed to the mail server
     */
    void sendTemplate(String to, String subject, String template, Map<String, Object> model);
}
