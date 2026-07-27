package com.sewasathi.repository;

import com.sewasathi.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Kills an entire rotation chain. Used when a token that was already spent comes back:
     * either it leaked, or a client is replaying, and neither is safe to keep serving.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RefreshToken t set t.revokedAt = :now where t.familyId = :familyId and t.revokedAt is null")
    int revokeFamily(@Param("familyId") String familyId, @Param("now") LocalDateTime now);

    /** Signs a user out everywhere - after a password reset, say. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RefreshToken t set t.revokedAt = :now where t.user.id = :userId and t.revokedAt is null")
    int revokeAllForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /**
     * Clears out tokens that can no longer be used by anyone. Without this the table only
     * ever grows, since rotation writes a new row on every refresh.
     */
    @Modifying
    @Query("delete from RefreshToken t where t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);

    long countByUserIdAndRevokedAtIsNull(Long userId);
}
