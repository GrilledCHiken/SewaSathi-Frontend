package com.sewasathi.repository;

import com.sewasathi.dto.report.TaskSummaryRow;
import com.sewasathi.dto.response.AnalyticsBreakdownRow;
import com.sewasathi.dto.response.CategoryStatsRow;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Task> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, TaskStatus status);
    List<Task> findByCustomerIdAndAssignedWorkerIsNotNullOrderByUpdatedAtDesc(Long customerId);

    List<Task> findByCustomerIdAndAssignedWorkerIdOrderByCreatedAtAsc(Long customerId, Long workerId);

    List<Task> findByAssignedWorkerIdOrderByCreatedAtDesc(Long workerId);
    List<Task> findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(Long workerId, TaskStatus status);

    /**
     * The worker's finished jobs, both settled and not. Earnings span
     * {@link TaskStatus#AWAITING_PAYMENT} as well as {@link TaskStatus#COMPLETED} - the
     * unsettled ones are exactly the money the page exists to chase.
     */
    List<Task> findByAssignedWorkerIdAndStatusInOrderByCreatedAtDesc(
            Long workerId, List<TaskStatus> statuses);

    List<Task> findByStatusOrderByCreatedAtDesc(TaskStatus status);

    long countByCustomerIdAndStatusIn(Long customerId, List<TaskStatus> statuses);
    long countByCustomerIdAndStatus(Long customerId, TaskStatus status);

    /**
     * Task volume by category and outcome over a window, for the report in
     * {@link com.sewasathi.service.ReportService} (requirement #14).
     */
    @Query("""
            select new com.sewasathi.dto.report.TaskSummaryRow(
                t.category, t.status, count(t), sum(t.budget))
            from Task t
            where t.createdAt >= :from and t.createdAt < :to
            group by t.category, t.status
            order by t.category, t.status
            """)
    List<TaskSummaryRow> summaryByCategoryAndStatus(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** Tasks posted in a window, for the admin analytics dashboard. */
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime from, LocalDateTime to);

    /**
     * The service categories with the most tasks in a window. {@code Limit} is applied by the
     * query itself, so a long tail of rarely used categories never leaves the database.
     */
    @Query("""
            select new com.sewasathi.dto.response.AnalyticsBreakdownRow(
                t.category, count(t), sum(t.budget))
            from Task t
            where t.createdAt >= :from and t.createdAt < :to
            group by t.category
            order by count(t) desc, t.category asc
            """)
    List<AnalyticsBreakdownRow> topCategories(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Limit limit);

    /** Tasks that reached a given outcome, over the platform's whole history. */
    long countByStatus(TaskStatus status);

    /** The newest still-unclaimed tasks, for the public "work available" panel. */
    List<Task> findByStatusOrderByCreatedAtDesc(TaskStatus status, Limit limit);

    /**
     * Task volume per service category over the whole history, for the public catalogue.
     *
     * <p>Unlike {@link #topCategories}, this is neither windowed nor truncated: the marketing
     * pages describe the platform as it stands, and every category the catalogue lists needs a
     * figure. Categories nobody has used simply do not come back, and the service fills them in.
     */
    @Query("""
            select new com.sewasathi.dto.response.CategoryStatsRow(
                t.category,
                count(t),
                sum(case when t.status = com.sewasathi.entity.TaskStatus.COMPLETED then 1L else 0L end))
            from Task t
            group by t.category
            """)
    List<CategoryStatsRow> categoryStats();

    /** The distinct cities tasks have actually been posted in - the real "cities covered". */
    @Query("""
            select distinct t.city from Task t
            where t.city is not null and trim(t.city) <> ''
            order by t.city asc
            """)
    List<String> distinctCities();

    /** The cities with the most tasks in a window, ranked the same way as the categories. */
    @Query("""
            select new com.sewasathi.dto.response.AnalyticsBreakdownRow(
                t.city, count(t), sum(t.budget))
            from Task t
            where t.createdAt >= :from and t.createdAt < :to
            group by t.city
            order by count(t) desc, t.city asc
            """)
    List<AnalyticsBreakdownRow> topLocations(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Limit limit);
}
