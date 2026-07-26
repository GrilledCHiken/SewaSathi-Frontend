package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A pending one-time-code challenge.
 *
 * <p>The code itself is never stored - only a BCrypt hash, exactly as with passwords. A
 * database leak must not hand an attacker a set of live sign-in codes.
 *
 * <p>{@code challengeToken} is the opaque handle the client holds between the two halves of
 * the login. Without it the client would have to re-send the email address (and the server
 * would have to trust it) when submitting the code.
 */
@Entity
@Table(name = "otp_tokens", indexes = {
        @Index(name = "idx_otp_challenge_token", columnList = "challenge_token", unique = true),
        @Index(name = "idx_otp_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Opaque handle given to the client; identifies the challenge without exposing the account. */
    @Column(name = "challenge_token", nullable = false, unique = true, length = 64)
    private String challengeToken;

    /** BCrypt hash of the 6-digit code. Never store the code itself. */
    @Column(name = "code_hash", nullable = false, length = 255)
    private String codeHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OtpPurpose purpose;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Wrong guesses so far; the token dies once this reaches the service's limit. */
    @Column(nullable = false, columnDefinition = "INT DEFAULT 0")
    @Builder.Default
    private int attempts = 0;

    @Column(nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    @Builder.Default
    private boolean consumed = false;

    /** Fingerprint of the device that triggered the challenge, trusted once the code is accepted. */
    @Column(name = "device_fingerprint", length = 64)
    private String deviceFingerprint;

    @Column(name = "device_label", length = 120)
    private String deviceLabel;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return expiresAt.isBefore(LocalDateTime.now());
    }
}
