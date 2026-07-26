package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A 10% advance a customer pays to confirm a task a worker has accepted.
 * One row per attempt: a fresh {@code transactionUuid} is minted every time the
 * customer starts a checkout, because the gateway keys everything off it.
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    /** The gateway's transaction_uuid — our handle on the payment across the redirect. */
    @Column(name = "transaction_uuid", nullable = false, unique = true, length = 64)
    private String transactionUuid;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /** Snapshot of the task budget when checkout started, so the split stays auditable. */
    @Column(name = "task_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal taskTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    /**
     * The handle the gateway itself issued when the payment was opened — Khalti's
     * {@code pidx}. Null for eSewa, which has no such step and is found by
     * {@code transactionUuid} instead.
     */
    @Column(name = "provider_ref", unique = true, length = 64)
    private String providerRef;

    @Column(name = "transaction_code", length = 60)
    private String transactionCode;

    @Column(name = "ref_id", length = 60)
    private String refId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
