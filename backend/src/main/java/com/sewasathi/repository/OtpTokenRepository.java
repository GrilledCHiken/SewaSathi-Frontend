package com.sewasathi.repository;

import com.sewasathi.entity.OtpToken;
import com.sewasathi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findByChallengeToken(String challengeToken);

    /** Outstanding challenges for a user, so issuing a new one can invalidate the old ones. */
    List<OtpToken> findByUserAndConsumedFalse(User user);

    /** Housekeeping: spent and expired challenges have no reason to accumulate. */
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
}
