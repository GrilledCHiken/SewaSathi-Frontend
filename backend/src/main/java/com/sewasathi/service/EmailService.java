package com.sewasathi.service;

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
 * <p>Callers never handle delivery failures: a mail server being down must not roll back a
 * registration or a payment. Implementations log and swallow.
 */
public interface EmailService {

    /** Plain-text email. Kept for simple notices that do not warrant a template. */
    void send(String to, String subject, String body);

    /**
     * Renders {@code template} (a Thymeleaf template under {@code templates/email/}, named
     * without the extension, e.g. {@code "email/verification"}) against {@code model} and
     * sends the result as HTML.
     */
    void sendTemplate(String to, String subject, String template, Map<String, Object> model);
}
