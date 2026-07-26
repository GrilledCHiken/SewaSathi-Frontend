package com.sewasathi.service;

import com.sewasathi.entity.NewsletterSubscriber;
import com.sewasathi.repository.NewsletterSubscriberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class NewsletterService {

    private final NewsletterSubscriberRepository newsletterSubscriberRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public void subscribe(String email) {
        String normalized = email.trim().toLowerCase();
        if (newsletterSubscriberRepository.existsByEmail(normalized)) {
            // Already subscribed. Return quietly rather than sending a second welcome -
            // the endpoint is public, so re-submitting must stay harmless (and must not
            // become a way to send mail to an arbitrary address repeatedly).
            return;
        }

        newsletterSubscriberRepository.save(
                NewsletterSubscriber.builder().email(normalized).build()
        );

        emailService.sendTemplate(
                normalized,
                "Welcome to Sewa Sathi",
                "email/newsletter-welcome",
                Map.of("actionUrl", frontendUrl + "/services")
        );
    }
}
