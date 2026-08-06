package com.sewasathi.service;

import com.sewasathi.exception.EmailDeliveryException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Map;

/**
 * Development/test stand-in for {@link SmtpEmailService}: logs what would have been sent
 * instead of contacting an SMTP server, so the app runs with no mail credentials.
 *
 * <p>Active unless {@code app.mail.enabled=true}.
 *
 * <p>It still renders the Thymeleaf template rather than skipping it, so a broken template
 * or a missing model attribute fails locally instead of surfacing for the first time in
 * production. The rendered HTML itself is not logged - the model map is, because that is
 * where the verification link and OTP code live and it is what a developer actually needs
 * to copy out of the console.
 */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class ConsoleEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleEmailService.class);

    private final SpringTemplateEngine templateEngine;

    @Override
    public void send(String to, String subject, String body) {
        log.info("==== DEV EMAIL ====\nTo: {}\nSubject: {}\n{}\n===================", to, subject, body);
    }

    @Override
    public void sendTemplate(String to, String subject, String template, Map<String, Object> model) {
        String html;
        try {
            Context context = new Context();
            context.setVariables(model);
            html = templateEngine.process(template, context);
        } catch (RuntimeException e) {
            // Fails the same way SmtpEmailService would, which is the point of rendering here
            // at all: a broken template should break in development, not in production.
            throw new EmailDeliveryException("Email template '" + template + "' failed to render", e);
        }

        log.info("""
                ==== DEV EMAIL ====
                To: {}
                Subject: {}
                Template: {} (rendered {} chars)
                Model: {}
                ===================""", to, subject, template, html.length(), model);
    }
}
