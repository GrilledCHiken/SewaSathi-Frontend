package com.sewasathi.controller;

import com.sewasathi.dto.response.ConversationResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final MessageService messageService;

    @GetMapping
    public List<ConversationResponse> myConversations(@AuthenticationPrincipal UserPrincipal principal) {
        return messageService.listConversations(principal.getUsername());
    }
}
