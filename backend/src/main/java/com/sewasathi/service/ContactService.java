package com.sewasathi.service;

import com.sewasathi.dto.request.ContactMessageRequest;
import com.sewasathi.entity.ContactMessage;
import com.sewasathi.repository.ContactMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactMessageRepository contactMessageRepository;

    @Transactional
    public void submit(ContactMessageRequest request) {
        ContactMessage message = ContactMessage.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .build();
        contactMessageRepository.save(message);
    }
}
