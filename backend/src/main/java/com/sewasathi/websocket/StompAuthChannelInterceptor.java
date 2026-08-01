package com.sewasathi.websocket;

import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.security.JwtService;
import com.sewasathi.service.ChatAccessService;
import com.sewasathi.service.ConversationKey;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern CONVERSATION_PATTERN =
            Pattern.compile("/(?:topic|app)/conversations/(c\\d+-w\\d+)");

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final ChatAccessService chatAccessService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        StompCommand command = accessor.getCommand();

        if (command == StompCommand.CONNECT) {
            authenticate(accessor);
        } else if (command == StompCommand.SUBSCRIBE || command == StompCommand.SEND) {
            authorizeConversationAccess(accessor);
        }

        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new AccessDeniedException("Missing authentication token");
        }
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        if (!jwtService.isValid(token, userDetails.getUsername())) {
            throw new AccessDeniedException("Invalid or expired token");
        }
        Authentication authToken =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        accessor.setUser(authToken);
    }

    private void authorizeConversationAccess(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }
        Matcher matcher = CONVERSATION_PATTERN.matcher(destination);
        if (!matcher.find()) {
            return;
        }
        String conversationKey = matcher.group(1);
        if (!isParticipant(principal.getName(), ConversationKey.parse(conversationKey))) {
            throw new AccessDeniedException("Not a participant of conversation " + conversationKey);
        }
    }

    private boolean isParticipant(String email, ConversationKey key) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || key == null) {
            return false;
        }
        if (!key.includes(user) && user.getRole() != Role.ADMIN) {
            return false;
        }
        // The pair must share a task the advance has been paid on - checked here as well
        // as in MessageService so the socket cannot be used to get around the REST gate.
        return !chatAccessService.unlockedSharedTasks(key).isEmpty();
    }
}
