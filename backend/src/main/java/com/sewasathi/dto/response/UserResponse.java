package com.sewasathi.dto.response;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

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
    private boolean emailVerified;
    private boolean twoFactorEnabled;

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.isSuspended(),
                user.isEmailVerified(),
                user.isTwoFactorEnabled()
        );
    }
}
