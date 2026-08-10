package com.sewasathi.repository;

import com.sewasathi.dto.report.RevenueReportRow;
import com.sewasathi.dto.response.RevenueTotals;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionUuid(String transactionUuid);

    /** Looks a payment up by the gateway's own handle — Khalti's {@code pidx}. */
    Optional<Payment> findByProviderRef(String providerRef);

    List<Payment> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Payment> findByTaskIdAndTypeAndStatus(Long taskId, PaymentType type, PaymentStatus status);

    boolean existsByTaskIdAndTypeAndStatus(Long taskId, PaymentType type, PaymentStatus status);

    /**
     * A cash claim on one task, for the worker being asked to vouch for it. COMPLETED is
     * accepted alongside PENDING so a second press of Confirm finds the row it already
     * settled rather than a 404.
     */
    List<Payment> findByTaskIdAndTypeAndProviderAndStatusIn(
            Long taskId, PaymentType type, PaymentProvider provider, Collection<PaymentStatus> statuses);

    /**
     * Unsettled claims across a set of tasks, for the worker earnings page - the same
     * batching trick as {@link #findByTaskIdInAndStatus}, on the other side of the ledger.
     */
    List<Payment> findByTaskIdInAndTypeAndProviderAndStatus(
            Collection<Long> taskIds, PaymentType type, PaymentProvider provider, PaymentStatus status);

    /**
     * Every settled leg across a set of tasks, for the worker earnings page. One round-trip
     * for the whole list; the caller groups by task and type in memory.
     */
    List<Payment> findByTaskIdInAndStatus(Collection<Long> taskIds, PaymentStatus status);

    /**
     * Which of these tasks have a payment in the given state - one round-trip where
     * {@link #existsByTaskIdAndTypeAndStatus} would cost a query per task. Blind to
     * {@link PaymentType}, since a settled balance implies a settled advance.
     */
    @Query("select p.task.id from Payment p where p.task.id in :taskIds and p.status = :status")
    List<Long> findTaskIdsByTaskIdInAndStatus(
            @Param("taskIds") Collection<Long> taskIds,
            @Param("status") PaymentStatus status);

    /**
     * Revenue by month and gateway, for the report in
     * {@link com.sewasathi.service.ReportService} (requirement #14). Grouped with JPQL's
     * {@code year()}/{@code month()} rather than a native {@code date_format}, so it runs on
     * both MySQL and H2. Restricted to {@link PaymentType#ADVANCE} because both legs carry the
     * same budget snapshot, and counting both would double every fully-paid task.
     */
    @Query("""
            select new com.sewasathi.dto.report.RevenueReportRow(
                year(p.createdAt), month(p.createdAt), p.provider,
                count(p), sum(p.amount), sum(p.taskTotal))
            from Payment p
            where p.status = :status
              and p.type = com.sewasathi.entity.PaymentType.ADVANCE
              and p.createdAt >= :from and p.createdAt < :to
            group by year(p.createdAt), month(p.createdAt), p.provider
            order by year(p.createdAt), month(p.createdAt), p.provider
            """)
    List<RevenueReportRow> revenueByMonthAndProvider(
            @Param("status") PaymentStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Money settled in a window, for the admin analytics dashboard. Ungrouped, so it always
     * returns one row - with null sums when nothing matched, which {@link RevenueTotals} folds
     * to zero. Advances only, as in {@link #revenueByMonthAndProvider}: a balance leg passes
     * through to the worker, so counting it would inflate both figures.
     */
    @Query("""
            select new com.sewasathi.dto.response.RevenueTotals(
                sum(p.taskTotal), sum(p.amount), count(p))
            from Payment p
            where p.status = :status
              and p.type = com.sewasathi.entity.PaymentType.ADVANCE
              and p.createdAt >= :from and p.createdAt < :to
            """)
    RevenueTotals totalsBetween(
            @Param("status") PaymentStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
