package com.sewasathi.repository;

import com.sewasathi.dto.report.WorkerPerformanceRow;
import com.sewasathi.dto.response.WorkerSkillRow;
import com.sewasathi.entity.WorkerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WorkerProfileRepository extends JpaRepository<WorkerProfile, Long> {
    Optional<WorkerProfile> findByUserId(Long userId);

    /**
     * Resolves an uploaded file back to the profile that owns it, so
     * {@link com.sewasathi.service.FileAccessService} can decide who may read it.
     * Identity documents and the public-facing profile photo are looked up separately
     * because they carry very different access rules.
     */
    Optional<WorkerProfile> findByPoliceClearanceUrlOrCitizenshipDocUrl(String policeUrl, String citizenshipUrl);

    /**
     * A police clearance renewal waiting on an admin. Lives in its own column, so it needs its own
     * lookup or the worker who just uploaded it - and the admin reviewing it - would be told the
     * file does not exist.
     */
    Optional<WorkerProfile> findByPendingPoliceClearanceUrl(String pendingPoliceClearanceUrl);

    /** Workers who have handed in a replacement police clearance report nobody has reviewed yet. */
    List<WorkerProfile> findByPendingPoliceClearanceUrlIsNotNullOrderByPendingPoliceClearanceUploadedAtAsc();

    Optional<WorkerProfile> findByProfilePhotoUrl(String profilePhotoUrl);

    /**
     * The skills and rates of workers a customer could actually hire, for the public catalogue.
     *
     * <p>Same visibility rule as {@code WorkerService.listAvailableWorkers}: approved and not
     * suspended. Only two columns are selected because the caller is an anonymous endpoint and
     * has no business loading identity document URLs.
     */
    @Query("""
            select new com.sewasathi.dto.response.WorkerSkillRow(wp.skills, wp.hourlyRate)
            from WorkerProfile wp join wp.user u
            where u.role = com.sewasathi.entity.Role.WORKER
              and u.status = com.sewasathi.entity.ApprovalStatus.APPROVED
              and u.suspended = false
            """)
    List<WorkerSkillRow> availableWorkerSkills();

    /**
     * Per-worker performance for the report in {@link com.sewasathi.service.ReportService}
     * (requirement #14).
     *
     * <p>Earnings come from a correlated subquery, not a join: joining payments would repeat
     * the profile row per payment and multiply every counter. It counts advances only, since
     * both legs carry the same {@code taskTotal} snapshot and would otherwise double-count.
     */
    @Query("""
            select new com.sewasathi.dto.report.WorkerPerformanceRow(
                u.fullName, u.email, wp.location, wp.tasksCompleted, wp.ratingAverage, wp.ratingCount,
                (select coalesce(sum(p.taskTotal), 0) from Payment p
                    where p.task.assignedWorker = u
                      and p.status = com.sewasathi.entity.PaymentStatus.COMPLETED
                      and p.type = com.sewasathi.entity.PaymentType.ADVANCE))
            from WorkerProfile wp join wp.user u
            where u.role = com.sewasathi.entity.Role.WORKER
              and u.status = com.sewasathi.entity.ApprovalStatus.APPROVED
            order by wp.tasksCompleted desc, wp.ratingAverage desc, u.fullName asc
            """)
    List<WorkerPerformanceRow> workerPerformance();
}
