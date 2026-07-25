package com.sewasathi.websocket;

import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
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

    private static final Pattern TASK_ID_PATTERN = Pattern.compile("/(?:topic|app)/tasks/(\\d+)");

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (command == StompCommand.CONNECT) {
            authenticate(accessor);
        } else if (command == StompCommand.SUBSCRIBE || command == StompCommand.SEND) {
            authorizeTaskAccess(accessor);
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

    private void authorizeTaskAccess(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            throw new AccessDeniedException("Not authenticated");
        }
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }
        Matcher matcher = TASK_ID_PATTERN.matcher(destination);
        if (!matcher.find()) {
            return;
        }
        Long taskId = Long.valueOf(matcher.group(1));
        if (!isParticipant(principal.getName(), taskId)) {
            throw new AccessDeniedException("Not a participant of task " + taskId);
        }
    }

    private boolean isParticipant(String email, Long taskId) {
        User user = userRepository.findByEmail(email).orElse(null);
        Task task = taskRepository.findById(taskId).orElse(null);
        if (user == null || task == null || task.getAssignedWorker() == null) {
            return false;
        }
        boolean isCustomer = task.getCustomer().getId().equals(user.getId());
        boolean isWorker = task.getAssignedWorker().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        return isCustomer || isWorker || isAdmin;
    }
}
