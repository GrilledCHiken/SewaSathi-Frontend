package com.sewasathi.repository;

import com.sewasathi.entity.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {

    Optional<PendingRegistration> findByEmail(String email);

    Optional<PendingRegistration> findByChallengeToken(String challengeToken);

    /**
     * Clears the way for a fresh attempt on the same address. Someone who mistyped their
     * email, gave up, and came back must not be blocked by the unique index on a row they
     * can no longer complete.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from PendingRegistration p where p.email = :email")
    int deleteByEmail(@Param("email") String email);

    /** Housekeeping for abandoned signups; nobody can spend these rows any more. */
    @Modifying
    @Query("delete from PendingRegistration p where p.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
