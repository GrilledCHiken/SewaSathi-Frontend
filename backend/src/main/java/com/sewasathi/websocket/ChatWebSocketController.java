package com.sewasathi.websocket;

import com.sewasathi.dto.request.SendMessageRequest;
import com.sewasathi.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;

    @MessageMapping("/tasks/{taskId}/send")
    public void send(@DestinationVariable Long taskId, @Payload SendMessageRequest request, Principal principal) {
        messageService.sendTextMessage(principal.getName(), taskId, request.getContent());
    }
}
