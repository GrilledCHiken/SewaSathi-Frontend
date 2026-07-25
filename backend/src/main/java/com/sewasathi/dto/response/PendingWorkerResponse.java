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
    private String address;
    private String yearsOfExperience;
    private String bio;
    private String policeClearanceUrl;
    private String citizenshipDocUrl;
    private String profilePhotoUrl;
    private LocalDateTime verificationSubmittedAt;

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
                profile != null ? profile.getAddress() : null,
                profile != null ? profile.getYearsOfExperience() : null,
                profile != null ? profile.getBio() : null,
                profile != null ? profile.getPoliceClearanceUrl() : null,
                profile != null ? profile.getCitizenshipDocUrl() : null,
                profile != null ? profile.getProfilePhotoUrl() : null,
                profile != null ? profile.getVerificationSubmittedAt() : null
        );
    }
}
