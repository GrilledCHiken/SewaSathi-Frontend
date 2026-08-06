package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A signup that has been submitted but not yet proved. Registration emails a six-digit code
 * to the address the user typed and parks everything they entered here; the {@code users}
 * row is written only when that code comes back (see
 * {@link com.sewasathi.service.RegistrationOtpService}).
 *
 * <p>Holding the draft here rather than creating a disabled {@code User} keeps unverified
 * addresses out of the accounts table entirely: nothing can sign in as one, admin listings
 * and counts are unaffected, and a mistyped address frees itself up again when the row
 * expires instead of permanently squatting on the unique index.
 *
 * <p>The password is already BCrypt-hashed on the way in - a table of pending signups is no
 * more entitled to plaintext than the accounts table is - and only the hash of the code is
 * kept, for the same reason.
 */
@Entity
@Table(name = "pending_registrations", indexes = {
        @Index(name = "idx_pending_registration_email", columnList = "email", unique = true),
        @Index(name = "idx_pending_registration_challenge", columnList = "challenge_token", unique = true),
        @Index(name = "idx_pending_registration_expires", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Lowercased, and unique: one signup attempt per address at a time. */
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    // Worker-only fields, carried through so the WorkerProfile can be built at the far end
    // of the challenge exactly as it would have been at submit time.

    @Column(length = 500)
    private String skills;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(length = 120)
    private String location;

    @Column(length = 1000)
    private String bio;

    /** BCrypt of the six-digit code that was emailed; never the code itself. */
    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    /**
     * Opaque handle the client quotes when submitting the code. The email address would
     * have worked as a key, but then anyone could aim guesses at an address they do not
     * control; a random token means only whoever started the signup can spend the attempts.
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

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired(LocalDateTime now) {
        return expiresAt.isBefore(now);
    }
}
