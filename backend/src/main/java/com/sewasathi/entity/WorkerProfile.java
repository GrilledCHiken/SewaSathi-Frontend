package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "worker_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 500)
    private String skills;

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(length = 120)
    private String location;

    @Column(length = 1000)
    private String bio;

    @Column(name = "rating_average", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAverage = BigDecimal.ZERO;

    @Column(name = "rating_count")
    @Builder.Default
    private Integer ratingCount = 0;

    @Column(name = "tasks_completed")
    @Builder.Default
    private Integer tasksCompleted = 0;

    @Column(length = 255)
    private String address;

    @Column(name = "years_of_experience", length = 50)
    private String yearsOfExperience;

    @Column(name = "police_clearance_url", length = 500)
    private String policeClearanceUrl;

    @Column(name = "citizenship_doc_url", length = 500)
    private String citizenshipDocUrl;

    @Column(name = "profile_photo_url", length = 500)
    private String profilePhotoUrl;

    @Column(name = "verification_submitted_at")
    private LocalDateTime verificationSubmittedAt;

    /**
     * When the <em>active</em> police clearance report was uploaded. A report is only good for
     * {@link #POLICE_CLEARANCE_VALIDITY_MONTHS} months, so this is the start of its window.
     *
     * <p>Null on rows written before this column existed; {@link #getEffectiveClearanceUploadedAt()}
     * falls back to {@link #verificationSubmittedAt} for those rather than a data backfill.
     */
    @Column(name = "police_clearance_uploaded_at")
    private LocalDateTime policeClearanceUploadedAt;

    /**
     * A renewal the worker has uploaded that an admin has not reviewed yet.
     *
     * <p>Held apart from {@link #policeClearanceUrl} on purpose: the worker stays APPROVED and keeps
     * working while the new report is in the queue, and the document on file is only replaced — and
     * the six-month clock only restarted — when an admin approves it.
     */
    @Column(name = "pending_police_clearance_url", length = 500)
    private String pendingPoliceClearanceUrl;

    @Column(name = "pending_police_clearance_uploaded_at")
    private LocalDateTime pendingPoliceClearanceUploadedAt;

    /** How long a police clearance report is accepted for. */
    public static final int POLICE_CLEARANCE_VALIDITY_MONTHS = 6;

    /** How far ahead of expiry the worker starts being warned. */
    public static final int POLICE_CLEARANCE_WARNING_DAYS = 30;

    /**
     * The upload date the expiry is measured from, healing rows that predate
     * {@link #policeClearanceUploadedAt} by falling back to when verification was filed.
     */
    public LocalDateTime getEffectiveClearanceUploadedAt() {
        if (policeClearanceUploadedAt != null) {
            return policeClearanceUploadedAt;
        }
        return policeClearanceUrl != null ? verificationSubmittedAt : null;
    }

    /** When the active report stops counting, or null if there is no report (or no date for it). */
    public LocalDateTime getPoliceClearanceExpiresAt() {
        LocalDateTime uploadedAt = getEffectiveClearanceUploadedAt();
        return uploadedAt != null ? uploadedAt.plusMonths(POLICE_CLEARANCE_VALIDITY_MONTHS) : null;
    }

    /** Where this worker's police clearance stands right now. Never null. */
    public PoliceClearanceStatus getPoliceClearanceStatus() {
        if (pendingPoliceClearanceUrl != null) {
            return PoliceClearanceStatus.RENEWAL_PENDING;
        }
        if (policeClearanceUrl == null) {
            return PoliceClearanceStatus.MISSING;
        }

        LocalDateTime expiresAt = getPoliceClearanceExpiresAt();
        if (expiresAt == null) {
            // A report with no date behind it: treat as valid rather than accusing an
            // approved worker of an expiry we cannot actually demonstrate.
            return PoliceClearanceStatus.VALID;
        }

        LocalDateTime now = LocalDateTime.now();
        if (!expiresAt.isAfter(now)) {
            return PoliceClearanceStatus.EXPIRED;
        }
        if (expiresAt.isBefore(now.plusDays(POLICE_CLEARANCE_WARNING_DAYS))) {
            return PoliceClearanceStatus.EXPIRING_SOON;
        }
        return PoliceClearanceStatus.VALID;
    }
}
