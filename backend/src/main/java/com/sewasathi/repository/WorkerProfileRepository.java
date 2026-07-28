package com.sewasathi.repository;

import com.sewasathi.dto.report.WorkerPerformanceRow;
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

    Optional<WorkerProfile> findByProfilePhotoUrl(String profilePhotoUrl);

    /**
     * Per-worker performance for the report in {@link com.sewasathi.service.ReportService}
     * (requirement #14).
     *
     * <p>Earnings come from a correlated subquery rather than another join. Joining payments
     * alongside the profile would repeat the profile row once per payment, and every counter
     * selected from it would be multiplied by the number of payments.
     */
    @Query("""
            select new com.sewasathi.dto.report.WorkerPerformanceRow(
                u.fullName, u.email, wp.location, wp.tasksCompleted, wp.ratingAverage, wp.ratingCount,
                (select coalesce(sum(p.taskTotal), 0) from Payment p
                    where p.task.assignedWorker = u and p.status = com.sewasathi.entity.PaymentStatus.COMPLETED))
            from WorkerProfile wp join wp.user u
            where u.role = com.sewasathi.entity.Role.WORKER
              and u.status = com.sewasathi.entity.ApprovalStatus.APPROVED
            order by wp.tasksCompleted desc, wp.ratingAverage desc, u.fullName asc
            """)
    List<WorkerPerformanceRow> workerPerformance();
}
