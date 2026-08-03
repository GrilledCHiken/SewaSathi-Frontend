package com.sewasathi.service;

import com.sewasathi.dto.request.ContactMessageRequest;
import com.sewasathi.dto.response.ContactMessageResponse;
import com.sewasathi.entity.ContactMessage;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.ContactMessageRepository;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final ContactMessageRepository contactMessageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public void submit(ContactMessageRequest request) {
        ContactMessage message = ContactMessage.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .subject(request.getSubject().trim())
                .message(request.getMessage().trim())
                .build();
        ContactMessage saved = contactMessageRepository.save(message);

        // Every administrator is told, rather than one of them: there is no assignment model
        // here, so an inquiry that only reached whichever admin happened to be picked could sit
        // unread indefinitely. notify() logs and swallows broker failures, so a WebSocket
        // hiccup cannot fail an anonymous form submission.
        for (User admin : userRepository.findByRole(Role.ADMIN)) {
            notificationService.notify(admin, "CONTACT_MESSAGE",
                    "New contact inquiry",
                    saved.getName() + " sent a message about " + saved.getSubject() + ".",
                    "/admin/inquiries");
        }
    }

    /** The admin inbox. A null filter means every inquiry, handled or not. */
    @Transactional(readOnly = true)
    public List<ContactMessageResponse> list(Boolean handled) {
        List<ContactMessage> messages = handled == null
                ? contactMessageRepository.findAllByOrderByCreatedAtDesc()
                : contactMessageRepository.findByHandledOrderByCreatedAtDesc(handled);
        return messages.stream().map(ContactMessageResponse::from).toList();
    }

    @Transactional
    public ContactMessageResponse setHandled(Long id, boolean handled) {
        ContactMessage message = contactMessageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No contact message with id " + id));
        message.setHandled(handled);
        // Cleared on reopen so the timestamp never describes a state the row is no longer in.
        message.setHandledAt(handled ? LocalDateTime.now() : null);
        return ContactMessageResponse.from(contactMessageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public long unhandledCount() {
        return contactMessageRepository.countByHandledFalse();
    }
}
