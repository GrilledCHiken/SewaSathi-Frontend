package com.sewasathi.dto.response;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private ApprovalStatus status;
    private boolean suspended;
    /**
     * Why a worker's application was turned down, so the client can show it rather than send
     * them to support. Null for everyone else.
     */
    private String rejectionReason;
    private String avatarUrl;
    /** Backs the "member since" line on My Profile. */
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.isSuspended(),
                user.getRejectionReason(),
                user.getAvatarUrl(),
                user.getCreatedAt()
        );
    }
}
