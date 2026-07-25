package com.sewasathi.controller;

import com.sewasathi.dto.response.MessageResponse;
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
@RequestMapping("/api/tasks/{taskId}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public List<MessageResponse> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId
    ) {
        return messageService.getHistory(principal.getUsername(), taskId);
    }

    @PostMapping("/attachments")
    public ResponseEntity<MessageResponse> uploadAttachment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file
    ) {
        FileStorageService.StoredFile stored = fileStorageService.store(file);
        MessageResponse response = messageService.sendAttachmentMessage(
                principal.getUsername(), taskId, stored.url(), stored.originalName(), stored.contentType()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
