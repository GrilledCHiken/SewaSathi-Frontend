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
 * A password reset in flight: the row a six-digit code is checked against, and what
 * authorises the new password at the far end. Only the hash of the code is stored.
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
     * A plain id rather than {@code @ManyToOne}: nothing is read off the user until the last
     * step, and a relation would drag the account into every expiry sweep.
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
     * Opaque handle the client quotes when submitting the code. Keyed on a random token
     * rather than the email so nobody can spend the attempts on an address they don't own.
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
     * Stamped when the code is accepted. Null means the code step has not been passed and the
     * password step must refuse.
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
