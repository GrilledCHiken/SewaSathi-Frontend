package com.sewasathi.service;

import com.sewasathi.exception.EmailDeliveryException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Real email delivery over SMTP, active when {@code app.mail.enabled=true}. Configured for
 * Gmail by default - see {@code spring.mail.*} in application.properties; Gmail requires an
 * App Password, not the account password.
 *
 * <p>Sends are synchronous and failures propagate as {@link EmailDeliveryException}. The
 * caller that matters here is registration, which cannot usefully continue without the code
 * having been delivered - so the handshake is worth waiting for, and the SMTP timeouts in
 * application.properties bound how long that wait can be. One retry covers a transient
 * connection reset; anything that survives it is reported.
 */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailService.class);

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.from-name:Sewa Sathi}")
    private String fromName;

    @Override
    public void send(String to, String subject, String body) {
        dispatch(to, subject, body, false);
    }

    @Override
    public void sendTemplate(String to, String subject, String template, Map<String, Object> model) {
        String html;
        try {
            Context context = new Context();
            context.setVariables(model);
            html = templateEngine.process(template, context);
        } catch (RuntimeException e) {
            // A broken template is our bug, not the mail server's, but the caller still needs
            // to know nothing was sent.
            throw new EmailDeliveryException("Email template '" + template + "' failed to render", e);
        }
        dispatch(to, subject, html, true);
    }

    private void dispatch(String to, String subject, String body, boolean html) {
        try {
            trySend(to, subject, body, html);
        } catch (Exception first) {
            log.warn("Email to {} failed ({}), retrying once", to, first.getMessage());
            try {
                trySend(to, subject, body, html);
            } catch (Exception retry) {
                log.error("Email to {} failed after retry. Subject: {}", to, subject, retry);
                throw new EmailDeliveryException("Could not send email to " + to, retry);
            }
        }
    }

    private void trySend(String to, String subject, String body, boolean html) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper =
                new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(body, html);
        mailSender.send(message);
        log.info("Sent email to {} (subject: {})", to, subject);
    }
}
