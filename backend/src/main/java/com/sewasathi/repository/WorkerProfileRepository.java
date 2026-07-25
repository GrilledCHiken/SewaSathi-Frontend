package com.sewasathi.repository;

import com.sewasathi.entity.WorkerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkerProfileRepository extends JpaRepository<WorkerProfile, Long> {
    Optional<WorkerProfile> findByUserId(Long userId);
}
