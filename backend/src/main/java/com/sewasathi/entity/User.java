package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /**
     * BCrypt hash of the password, or null for a Google-only account. {@code AuthService.login}
     * checks for null explicitly rather than letting the encoder decide.
     */
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    /**
     * Profile picture, stored as the {@code /uploads/<uuid>.<ext>} URL returned by
     * {@link com.sewasathi.service.FileStorageService}. A worker's copy is mirrored onto
     * their profile so the browse listing has a single field to read.
     */
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApprovalStatus status;

    /**
     * Which route created this account. See {@link AuthProvider} - it does not govern how the
     * account signs in.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /**
     * Google's immutable {@code sub} for the linked account, or null. Pinned rather than
     * trusting the email, which a Workspace admin can reassign to a different person.
     */
    @Column(name = "provider_id", length = 128)
    private String providerId;

    @Column(nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean suspended;

    /**
     * Why an admin suspended this account. Shown to the person, so it is written for them
     * rather than as an internal note. Cleared on unsuspend.
     */
    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    /**
     * Why an admin turned this worker's application down. Shown to them verbatim in a banner,
     * so it is written for them rather than as an internal note. Cleared on approval.
     */
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "failed_login_attempts", nullable = false, columnDefinition = "INT DEFAULT 0")
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
