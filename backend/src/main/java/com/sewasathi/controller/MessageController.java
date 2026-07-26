package com.sewasathi.controller;

import com.sewasathi.dto.response.MessageResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @DeleteMapping("/{messageId}")
    public MessageResponse delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long messageId
    ) {
        return messageService.deleteMessage(principal.getUsername(), messageId);
    }
}
