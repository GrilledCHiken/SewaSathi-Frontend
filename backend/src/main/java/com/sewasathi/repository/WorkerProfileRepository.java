package com.sewasathi.repository;

import com.sewasathi.entity.WorkerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkerProfileRepository extends JpaRepository<WorkerProfile, Long> {
    Optional<WorkerProfile> findByUserId(Long userId);

    /**
     * Resolves an uploaded file back to the profile that owns it, so
     * {@link com.sewasathi.service.FileAccessService} can decide who may read it.
     * Identity documents and the public-facing profile photo are looked up separately
     * because they carry very different access rules.
     */
    Optional<WorkerProfile> findByPoliceClearanceUrlOrCitizenshipDocUrl(String policeUrl, String citizenshipUrl);

    Optional<WorkerProfile> findByProfilePhotoUrl(String profilePhotoUrl);
}
