package com.sewasathi.repository;

import com.sewasathi.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndReadFalse(Long userId);

    /** Scoped by user id as well as notification id so one account cannot read another's. */
    Optional<Notification> findByIdAndUserId(Long id, Long userId);
}
