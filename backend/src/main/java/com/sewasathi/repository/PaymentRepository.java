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
     * Which of these tasks have a payment in the given state. Answers "has the advance
     * settled?" for a whole conversation in one round-trip, where
     * {@link #existsByTaskIdAndTypeAndStatus} would cost a query per task.
     *
     * <p>Deliberately blind to {@link PaymentType}: a settled balance implies a settled
     * advance, so "any payment cleared" is the same question for the caller that unlocks chat.
     */
    @Query("select p.task.id from Payment p where p.task.id in :taskIds and p.status = :status")
    List<Long> findTaskIdsByTaskIdInAndStatus(
            @Param("taskIds") Collection<Long> taskIds,
            @Param("status") PaymentStatus status);

    /**
     * Revenue by month and gateway, for the report in
     * {@link com.sewasathi.service.ReportService} (requirement #14).
     *
     * <p>Grouped with JPQL's {@code year()}/{@code month()} rather than a native
     * {@code date_format}, so the same query runs on MySQL in production and on H2 in tests.
     *
     * <p>Restricted to {@link PaymentType#ADVANCE}. {@code sum(p.taskTotal)} is the value of
     * the work booked, and each leg of a task carries the same budget snapshot - counting
     * both would report every fully-paid task's value twice.
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
     * returns exactly one row - with null sums when nothing matched, which
     * {@link RevenueTotals} folds to zero.
     *
     * <p>Advances only, for the same reason as {@link #revenueByMonthAndProvider}: gross
     * value is the budget of each booking, and the platform's cut is the advance. A balance
     * leg passes through to the worker, so counting it would inflate both.
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
