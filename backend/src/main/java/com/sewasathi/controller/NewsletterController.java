package com.sewasathi.controller;

import com.sewasathi.dto.request.NewsletterSubscribeRequest;
import com.sewasathi.service.NewsletterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/newsletter")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterService newsletterService;

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@Valid @RequestBody NewsletterSubscribeRequest request) {
        newsletterService.subscribe(request.getEmail());
        return ResponseEntity.ok().build();
    }
}
