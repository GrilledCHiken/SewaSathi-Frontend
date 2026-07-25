package com.sewasathi.service;

import com.sewasathi.entity.NewsletterSubscriber;
import com.sewasathi.repository.NewsletterSubscriberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NewsletterService {

    private final NewsletterSubscriberRepository newsletterSubscriberRepository;

    @Transactional
    public void subscribe(String email) {
        String normalized = email.trim().toLowerCase();
        if (!newsletterSubscriberRepository.existsByEmail(normalized)) {
            newsletterSubscriberRepository.save(
                    NewsletterSubscriber.builder().email(normalized).build()
            );
        }
    }
}
