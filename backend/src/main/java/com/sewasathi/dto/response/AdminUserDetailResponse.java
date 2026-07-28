package com.sewasathi.dto.response;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * The full account record behind the admin console's user detail modal.
 *
 * <p>This is the union of {@link PendingWorkerResponse} (verification documents) and
 * {@link WorkerSummaryResponse} (ratings and completed tasks) - an admin reviewing an
 * account wants both, and neither existing DTO carries the two sets together. The list
 * endpoint keeps returning the slimmer {@link AdminUserResponse}, so the extra join is
 * only paid for when a row is actually opened.
 */
@Getter
@AllArgsConstructor
public class AdminUserDetailResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private ApprovalStatus status;
    private boolean suspended;
    private String avatarUrl;
    private LocalDateTime createdAt;

    /** Null for customers; populated when the account is a worker with a profile. */
    private WorkerProfileDetail workerProfile;

    public static AdminUserDetailResponse from(User user, WorkerProfile profile) {
        return new AdminUserDetailResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.isSuspended(),
                user.getAvatarUrl(),
                user.getCreatedAt(),
                profile != null ? WorkerProfileDetail.from(profile) : null
        );
    }

    @Getter
    @AllArgsConstructor
    public static class WorkerProfileDetail {
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

        static WorkerProfileDetail from(WorkerProfile profile) {
            return new WorkerProfileDetail(
                    profile.getSkills(),
                    profile.getHourlyRate(),
                    profile.getLocation(),
                    profile.getAddress(),
                    profile.getYearsOfExperience(),
                    profile.getBio(),
                    profile.getRatingAverage(),
                    profile.getRatingCount(),
                    profile.getTasksCompleted(),
                    profile.getPoliceClearanceUrl(),
                    profile.getCitizenshipDocUrl(),
                    profile.getProfilePhotoUrl(),
                    profile.getVerificationSubmittedAt()
            );
        }
    }
}
