package com.sewasathi.repository;

import com.sewasathi.dto.report.RevenueReportRow;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionUuid(String transactionUuid);

    /** Looks a payment up by the gateway's own handle — Khalti's {@code pidx}. */
    Optional<Payment> findByProviderRef(String providerRef);

    List<Payment> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Payment> findByTaskIdAndStatus(Long taskId, PaymentStatus status);

    boolean existsByTaskIdAndStatus(Long taskId, PaymentStatus status);

    /**
     * Revenue by month and gateway, for the report in
     * {@link com.sewasathi.service.ReportService} (requirement #14).
     *
     * <p>Grouped with JPQL's {@code year()}/{@code month()} rather than a native
     * {@code date_format}, so the same query runs on MySQL in production and on H2 in tests.
     */
    @Query("""
            select new com.sewasathi.dto.report.RevenueReportRow(
                year(p.createdAt), month(p.createdAt), p.provider,
                count(p), sum(p.amount), sum(p.taskTotal))
            from Payment p
            where p.status = :status and p.createdAt >= :from and p.createdAt < :to
            group by year(p.createdAt), month(p.createdAt), p.provider
            order by year(p.createdAt), month(p.createdAt), p.provider
            """)
    List<RevenueReportRow> revenueByMonthAndProvider(
            @Param("status") PaymentStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
