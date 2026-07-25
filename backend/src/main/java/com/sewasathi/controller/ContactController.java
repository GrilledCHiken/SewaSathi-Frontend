package com.sewasathi.controller;

import com.sewasathi.dto.request.ContactMessageRequest;
import com.sewasathi.service.ContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @PostMapping
    public ResponseEntity<Void> submit(@Valid @RequestBody ContactMessageRequest request) {
        contactService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
