package com.sewasathi.repository;

import com.sewasathi.entity.PasswordResetChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetChallengeRepository extends JpaRepository<PasswordResetChallenge, Long> {

    Optional<PasswordResetChallenge> findByEmail(String email);

    Optional<PasswordResetChallenge> findByChallengeToken(String challengeToken);

    /**
     * Clears the way for a fresh attempt on the same address, once the cooldown on the
     * previous one has run out. The unique index on {@code email} means the new row cannot be
     * written until the old one is gone.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from PasswordResetChallenge c where c.email = :email")
    int deleteByEmail(@Param("email") String email);

    /** Housekeeping for abandoned resets; nobody can spend these rows any more. */
    @Modifying
    @Query("delete from PasswordResetChallenge c where c.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
