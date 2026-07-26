package com.sewasathi.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Real email delivery over SMTP (requirement #13), active when {@code app.mail.enabled=true}.
 * Configured for Gmail by default - see {@code spring.mail.*} in application.properties;
 * Gmail requires an App Password, not the account password.
 *
 * <p>Every send is {@link Async}: SMTP handshakes take hundreds of milliseconds and an
 * unreachable mail server can block for the full connection timeout. Making a customer wait
 * that long to finish registering - or worse, failing the registration because the mail
 * server is down - would be the wrong trade. Delivery failures are logged and swallowed.
 *
 * <p>Because the send runs on another thread after the caller's transaction has committed,
 * entities must not be passed in the model; callers pass already-materialised values.
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
    @Async("mailExecutor")
    public void send(String to, String subject, String body) {
        dispatch(to, subject, body, false);
    }

    @Override
    @Async("mailExecutor")
    public void sendTemplate(String to, String subject, String template, Map<String, Object> model) {
        String html;
        try {
            Context context = new Context();
            context.setVariables(model);
            html = templateEngine.process(template, context);
        } catch (RuntimeException e) {
            log.error("Email template '{}' failed to render; not sending to {}", template, to, e);
            return;
        }
        dispatch(to, subject, html, true);
    }

    private void dispatch(String to, String subject, String body, boolean html) {
        try {
            trySend(to, subject, body, html);
        } catch (MailException | jakarta.mail.MessagingException | UnsupportedEncodingException first) {
            // One retry covers the common case of a transient connection reset. Anything
            // persistent is logged and dropped rather than retried into a backlog.
            log.warn("Email to {} failed ({}), retrying once", to, first.getMessage());
            try {
                trySend(to, subject, body, html);
            } catch (Exception retry) {
                log.error("Email to {} failed after retry; giving up. Subject: {}", to, subject, retry);
            }
        }
    }

    private void trySend(String to, String subject, String body, boolean html)
            throws jakarta.mail.MessagingException, UnsupportedEncodingException {
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
