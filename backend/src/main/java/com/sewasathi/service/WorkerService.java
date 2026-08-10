package com.sewasathi.service;

import com.sewasathi.dto.request.UpdateWorkerProfileRequest;
import com.sewasathi.dto.response.WorkerSummaryResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkerService {

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final FileStorageService fileStorageService;

    public List<WorkerSummaryResponse> listAvailableWorkers(String skill, String location, BigDecimal minRate, BigDecimal maxRate, String query) {
        List<User> workers = userRepository.findByRoleAndStatusAndSuspendedFalseOrderByCreatedAtDesc(
                Role.WORKER, ApprovalStatus.APPROVED);

        String skillFilter = normalize(skill);
        String locationFilter = normalize(location);
        String queryFilter = normalize(query);

        return workers.stream()
                .map(user -> WorkerSummaryResponse.from(user, workerProfileRepository.findByUserId(user.getId()).orElse(null)))
                .filter(w -> skillFilter == null || (w.getSkills() != null && w.getSkills().toLowerCase().contains(skillFilter)))
                .filter(w -> locationFilter == null || (w.getLocation() != null && w.getLocation().toLowerCase().contains(locationFilter)))
                .filter(w -> minRate == null || (w.getHourlyRate() != null && w.getHourlyRate().compareTo(minRate) >= 0))
                .filter(w -> maxRate == null || (w.getHourlyRate() != null && w.getHourlyRate().compareTo(maxRate) <= 0))
                .filter(w -> queryFilter == null
                        || w.getFullName().toLowerCase().contains(queryFilter)
                        || (w.getSkills() != null && w.getSkills().toLowerCase().contains(queryFilter)))
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkerSummaryResponse getMyProfile(String email) {
        User user = getWorkerUser(email);
        WorkerProfile profile = getProfileOrThrow(user.getId());
        return WorkerSummaryResponse.from(user, profile);
    }

    @Transactional
    public WorkerSummaryResponse updateMyProfile(String email, UpdateWorkerProfileRequest request) {
        User user = getWorkerUser(email);
        WorkerProfile profile = getProfileOrThrow(user.getId());

        profile.setSkills(request.getSkills() != null ? request.getSkills().trim() : null);
        profile.setHourlyRate(request.getHourlyRate());
        profile.setLocation(request.getLocation() != null ? request.getLocation().trim() : null);
        profile.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        profile.setYearsOfExperience(
                request.getYearsOfExperience() != null ? request.getYearsOfExperience().trim() : null);
        profile.setBio(request.getBio() != null ? request.getBio().trim() : null);
        profile = workerProfileRepository.save(profile);

        return WorkerSummaryResponse.from(user, profile);
    }

    /**
     * Files a replacement police clearance report for review. The new file is parked in the
     * profile's pending columns rather than replacing what is on record, so the worker keeps
     * their approval while an admin looks at it. Only
     * {@code AdminService.approveClearanceRenewal} promotes it and restarts the clock.
     */
    @Transactional
    public WorkerSummaryResponse submitPoliceClearanceRenewal(String email, String storedUrl) {
        User user = getWorkerUser(email);
        WorkerProfile profile = getProfileOrThrow(user.getId());

        if (!StringUtils.hasText(profile.getPoliceClearanceUrl())) {
            // Nothing to renew: this worker never finished verification.
            throw new InvalidOperationException(
                    "Submit your verification documents before renewing your police clearance report");
        }

        // Uploading twice before an admin gets to either one would leave the first file orphaned.
        String superseded = profile.getPendingPoliceClearanceUrl();

        profile.setPendingPoliceClearanceUrl(storedUrl);
        profile.setPendingPoliceClearanceUploadedAt(LocalDateTime.now());
        profile = workerProfileRepository.save(profile);

        if (StringUtils.hasText(superseded)) {
            fileStorageService.delete(superseded);
        }

        return WorkerSummaryResponse.from(user, profile);
    }

    @Transactional
    public WorkerSummaryResponse submitVerification(
            String email,
            String fullName,
            String phone,
            String city,
            String address,
            String skills,
            String yearsOfExperience,
            BigDecimal hourlyRate,
            String bio,
            String policeClearanceUrl,
            String citizenshipDocUrl,
            String profilePhotoUrl
    ) {
        if (!StringUtils.hasText(policeClearanceUrl)) {
            throw new InvalidOperationException("A police clearance report is required for verification");
        }
        if (!StringUtils.hasText(citizenshipDocUrl)) {
            throw new InvalidOperationException("A citizenship/ID document is required for verification");
        }

        User user = getWorkerUser(email);
        WorkerProfile profile = getProfileOrThrow(user.getId());

        if (StringUtils.hasText(fullName)) {
            user.setFullName(fullName.trim());
        }
        if (StringUtils.hasText(phone)) {
            user.setPhone(phone.trim());
        }
        userRepository.save(user);

        profile.setLocation(city != null ? city.trim() : null);
        profile.setAddress(address != null ? address.trim() : null);
        profile.setSkills(skills != null ? skills.trim() : null);
        profile.setYearsOfExperience(yearsOfExperience != null ? yearsOfExperience.trim() : null);
        profile.setHourlyRate(hourlyRate);
        profile.setBio(bio != null ? bio.trim() : null);
        profile.setPoliceClearanceUrl(policeClearanceUrl);
        // Starts the six-month renewal window for the report just handed in.
        profile.setPoliceClearanceUploadedAt(LocalDateTime.now());
        profile.setCitizenshipDocUrl(citizenshipDocUrl);
        if (StringUtils.hasText(profilePhotoUrl)) {
            profile.setProfilePhotoUrl(profilePhotoUrl);
        }
        profile.setVerificationSubmittedAt(LocalDateTime.now());
        profile = workerProfileRepository.save(profile);

        return WorkerSummaryResponse.from(user, profile);
    }

    private User getWorkerUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }

    private WorkerProfile getProfileOrThrow(Long userId) {
        return workerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No worker profile for user " + userId));
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase();
    }
}
