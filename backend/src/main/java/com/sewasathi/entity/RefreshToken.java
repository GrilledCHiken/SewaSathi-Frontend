package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * A long-lived credential that buys a new short-lived access token (requirement #2).
 *
 * <p>Access tokens are now minutes long, which means a stolen one expires quickly - but it
 * also means the SPA needs something to renew with. That something is stored here so it can
 * be revoked, which a self-contained JWT never can be.
 *
 * <p>Only the SHA-256 hash of the token is persisted. A database leak therefore yields no
 * usable credential, for the same reason password hashes are stored rather than passwords.
 */
@Entity
@Table(name = "refresh_tokens", indexes = {
        @Index(name = "idx_refresh_token_hash", columnList = "token_hash", unique = true),
        @Index(name = "idx_refresh_token_family", columnList = "family_id"),
        @Index(name = "idx_refresh_token_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** SHA-256 of the token that was handed to the client; never the token itself. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /**
     * Shared by every token in one rotation chain, so that detecting a replayed token can
     * revoke the whole lineage rather than just the one that was replayed.
     */
    @Column(name = "family_id", nullable = false, length = 36)
    private String familyId;

    /** Which device the chain started on, for the "signed-in devices" view and for auditing. */
    @Column(name = "device_label", length = 120)
    private String deviceLabel;

    @CreationTimestamp
    @Column(name = "issued_at", updatable = false)
    private LocalDateTime issuedAt;

    /** Absolute lifetime. Rotation does not extend it - a chain has a hard end. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /**
     * When this token was last exchanged. Drives the idle timeout: a session nobody has
     * touched for longer than the idle window is finished, however much absolute life is left.
     */
    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    /** Set when the token is spent by rotation, replaced, or explicitly revoked. */
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired(LocalDateTime now) {
        return expiresAt.isBefore(now);
    }

    /** Idle is measured from the last exchange, or from issue if it was never used. */
    public LocalDateTime lastActivity() {
        return lastUsedAt != null ? lastUsedAt : issuedAt;
    }
}
