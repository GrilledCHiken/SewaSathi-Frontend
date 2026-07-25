package com.sewasathi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * No SMTP provider is configured for this project, so outgoing email is simulated by logging
 * it. Swap this out for a real {@link EmailService} implementation (e.g. JavaMailSender-backed)
 * once mail credentials are available - nothing else in the codebase needs to change.
 */
@Service
public class ConsoleEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleEmailService.class);

    @Override
    public void send(String to, String subject, String body) {
        log.info("==== DEV EMAIL ====\nTo: {}\nSubject: {}\n{}\n===================", to, subject, body);
    }
}
