package com.sewasathi.repository;

import com.sewasathi.dto.report.TaskSummaryRow;
import com.sewasathi.dto.response.AnalyticsBreakdownRow;
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
