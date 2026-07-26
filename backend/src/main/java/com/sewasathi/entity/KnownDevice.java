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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A device this account has signed in from before, so a sign-in from anywhere else can be
 * challenged with an emailed code.
 *
 * <p>The fingerprint is a hash of the User-Agent plus a coarsened IP - deliberately weak
 * identification. It is a prompt for a second factor, not a security boundary: a fingerprint
 * is trivially forged by anyone who has already stolen the password, which is why the code
 * itself does the actual work. Coarsening the IP to its network prefix stops a customer on
 * mobile data from being re-challenged every time their carrier rotates their address.
 */
@Entity
@Table(name = "known_devices",
        uniqueConstraints = @UniqueConstraint(name = "uk_device_user_fingerprint",
                columnNames = {"user_id", "fingerprint"}),
        indexes = @Index(name = "idx_device_user", columnList = "user_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnownDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64)
    private String fingerprint;

    /** Human-readable summary shown in the alert email, e.g. "Chrome on Windows". */
    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
