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
    private LocalDateTime createdAt;

    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.isSuspended(),
                user.getCreatedAt()
        );
    }
}
