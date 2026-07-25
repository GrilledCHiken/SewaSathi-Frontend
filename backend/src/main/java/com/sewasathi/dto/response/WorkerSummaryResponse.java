package com.sewasathi.dto.response;

import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class WorkerSummaryResponse {
    private Long id;
    private String fullName;
    private String phone;
    private String skills;
    private BigDecimal hourlyRate;
    private String location;
    private String address;
    private String yearsOfExperience;
    private String bio;
    private BigDecimal ratingAverage;
    private Integer ratingCount;
    private Integer tasksCompleted;
    private String policeClearanceUrl;
    private String citizenshipDocUrl;
    private String profilePhotoUrl;
    private LocalDateTime verificationSubmittedAt;

    public static WorkerSummaryResponse from(User user, WorkerProfile profile) {
        return new WorkerSummaryResponse(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                profile != null ? profile.getSkills() : null,
                profile != null ? profile.getHourlyRate() : null,
                profile != null ? profile.getLocation() : null,
                profile != null ? profile.getAddress() : null,
                profile != null ? profile.getYearsOfExperience() : null,
                profile != null ? profile.getBio() : null,
                profile != null ? profile.getRatingAverage() : BigDecimal.ZERO,
                profile != null ? profile.getRatingCount() : 0,
                profile != null ? profile.getTasksCompleted() : 0,
                profile != null ? profile.getPoliceClearanceUrl() : null,
                profile != null ? profile.getCitizenshipDocUrl() : null,
                profile != null ? profile.getProfilePhotoUrl() : null,
                profile != null ? profile.getVerificationSubmittedAt() : null
        );
    }
}
