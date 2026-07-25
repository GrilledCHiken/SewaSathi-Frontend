package com.sewasathi.dto.response;

import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class PendingWorkerResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private LocalDateTime createdAt;
    private String skills;
    private BigDecimal hourlyRate;
    private String location;
    private String bio;

    public static PendingWorkerResponse from(User user, WorkerProfile profile) {
        return new PendingWorkerResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getCreatedAt(),
                profile != null ? profile.getSkills() : null,
                profile != null ? profile.getHourlyRate() : null,
                profile != null ? profile.getLocation() : null,
                profile != null ? profile.getBio() : null
        );
    }
}
