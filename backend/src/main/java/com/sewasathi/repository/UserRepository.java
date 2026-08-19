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

    Optional<User> findByAvatarUrl(String avatarUrl);

    long countByRole(Role role);

    
    long countByRoleNotAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Role role, LocalDateTime from, LocalDateTime to);

    long countByRoleAndStatus(Role role, ApprovalStatus status);

    
    long countByRoleAndStatusAndSuspendedFalse(Role role, ApprovalStatus status);

    List<User> findByRole(Role role);

    List<User> findByRoleAndStatusOrderByCreatedAtAsc(Role role, ApprovalStatus status);
    List<User> findByRoleAndStatusAndSuspendedFalseOrderByCreatedAtDesc(Role role, ApprovalStatus status);
}
