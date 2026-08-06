package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A password reset in flight. Someone has asked to reset the password on an account and a
 * six-digit code has gone out to its address; this row is what the code is checked against
 * and what authorises the new password at the far end (see
 * {@link com.sewasathi.service.PasswordResetService}).
 *
 * <p>Kept in its own table rather than as columns on {@code users}, for the same reason
 * {@link PendingRegistration} is: a reset is a short-lived side quest, and hanging its
 * bookkeeping off the accounts table would mean every account carries five columns that are
 * null almost all of the time.
 *
 * <p>Only the hash of the code is stored, never the code itself.
 */
@Entity
@Table(name = "password_reset_challenges", indexes = {
        @Index(name = "idx_password_reset_email", columnList = "email", unique = true),
        @Index(name = "idx_password_reset_challenge", columnList = "challenge_token", unique = true),
        @Index(name = "idx_password_reset_expires", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The account being reset. A plain id rather than a {@code @ManyToOne}: this row never
     * reads anything off the user until the very last step, and a relation would drag the
     * account into every expiry sweep for no benefit.
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Lowercased, and unique: one reset in flight per address at a time. */
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** BCrypt of the six-digit code that was emailed; never the code itself. */
    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    /**
     * Opaque handle the client quotes when submitting the code. The email address would have
     * worked as a key, but then anyone could aim guesses at an address they do not control;
     * a random token means only whoever asked for the reset can spend the attempts.
     */
    @Column(name = "challenge_token", nullable = false, unique = true, length = 36)
    private String challengeToken;

    /** Wrong guesses so far against the current code. Reset whenever a new code is issued. */
    @Column(nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** When the current code went out. Drives the resend cooldown. */
    @Column(name = "last_sent_at", nullable = false)
    private LocalDateTime lastSentAt;

    /**
     * Stamped when the code is accepted, and the only thing that separates this from
     * {@link PendingRegistration}: the row outlives its code so the caller can come back with
     * a new password. Null here means the code step has not been passed and the password
     * step must refuse.
     */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired(LocalDateTime now) {
        return expiresAt.isBefore(now);
    }

    public boolean isVerified() {
        return verifiedAt != null;
    }
}
