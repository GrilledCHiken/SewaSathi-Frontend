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
 * A signup submitted but not yet proved. Everything the user entered is parked here and the
 * {@code users} row is written only once the emailed code comes back, so unverified addresses
 * never reach the accounts table and a mistyped one frees itself when the row expires. The
 * password arrives already BCrypt-hashed, and only the hash of the code is kept.
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

    // Worker-only fields, carried through so the WorkerProfile can be built once the
    // challenge is passed.

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

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired(LocalDateTime now) {
        return expiresAt.isBefore(now);
    }
}
