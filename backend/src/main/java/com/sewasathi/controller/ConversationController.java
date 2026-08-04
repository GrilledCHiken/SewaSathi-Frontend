package com.sewasathi.controller;

import com.sewasathi.dto.response.ConversationResponse;
import com.sewasathi.dto.response.MessageResponse;
import com.sewasathi.dto.response.UnreadSummaryResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.FileStorageService;
import com.sewasathi.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public List<ConversationResponse> myConversations(@AuthenticationPrincipal UserPrincipal principal) {
        return messageService.listConversations(principal.getUsername());
    }

    /**
     * Declared ahead of the {@code /{conversationKey}/...} routes so "unread-count" is not
     * matched as a conversation key.
     */
    @GetMapping("/unread-count")
    public UnreadSummaryResponse unreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        return messageService.unreadSummary(principal.getUsername());
    }

    @GetMapping("/{conversationKey}/messages")
    public List<MessageResponse> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String conversationKey
    ) {
        return messageService.getHistory(principal.getUsername(), conversationKey);
    }

    @PostMapping("/{conversationKey}/messages/attachments")
    public ResponseEntity<MessageResponse> uploadAttachment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String conversationKey,
            @RequestParam("file") MultipartFile file
    ) {
        FileStorageService.StoredFile stored = fileStorageService.store(file);
        MessageResponse response = messageService.sendAttachmentMessage(
                principal.getUsername(), conversationKey, stored.url(), stored.originalName(), stored.contentType()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** Called when the user opens a thread. Idempotent - re-reading an already-read thread is a no-op. */
    @PostMapping("/{conversationKey}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String conversationKey
    ) {
        messageService.markConversationRead(principal.getUsername(), conversationKey);
        return ResponseEntity.noContent().build();
    }
}
