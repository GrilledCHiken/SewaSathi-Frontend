package com.sewasathi.dto.response;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class AdminUserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private ApprovalStatus status;
    private boolean suspended;
    private String suspensionReason;
    private LocalDateTime createdAt;

    /**
     * Whether the account holder was told. Null everywhere except the suspend/unsuspend
     * replies - the directory listing sends no mail, so it must not claim anything either way.
     */
    private Boolean emailSent;

    public static AdminUserResponse from(User user) {
        return from(user, null);
    }

    public static AdminUserResponse from(User user, Boolean emailSent) {
        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.isSuspended(),
                user.getSuspensionReason(),
                user.getCreatedAt(),
                emailSent
        );
    }
}
