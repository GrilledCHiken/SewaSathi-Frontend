package com.sewasathi.repository;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Used by {@code FileAccessService} to authorise a read of a profile picture. */
    Optional<User> findByAvatarUrl(String avatarUrl);

    long countByRole(Role role);

    /**
     * Sign-ups in a window, for the admin analytics dashboard. Excludes a role so bootstrap
     * administrators - who never signed up - are left out of the figure.
     */
    long countByRoleNotAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Role role, LocalDateTime from, LocalDateTime to);

    long countByRoleAndStatus(Role role, ApprovalStatus status);

    /**
     * How many workers the public pages may count as verified. The conditions match
     * {@code findByRoleAndStatusAndSuspendedFalseOrderByCreatedAtDesc}, which is what
     * {@code WorkerService.listAvailableWorkers} browses, so the headline figure can never
     * claim more professionals than a customer would actually find.
     */
    long countByRoleAndStatusAndSuspendedFalse(Role role, ApprovalStatus status);

    List<User> findByRoleAndStatusOrderByCreatedAtAsc(Role role, ApprovalStatus status);
    List<User> findByRoleAndStatusAndSuspendedFalseOrderByCreatedAtDesc(Role role, ApprovalStatus status);
}
