package com.sewasathi.repository;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    long countByRole(Role role);
    long countByRoleAndStatus(Role role, ApprovalStatus status);
    List<User> findByRoleAndStatusOrderByCreatedAtAsc(Role role, ApprovalStatus status);
    List<User> findByRoleAndStatusAndSuspendedFalseOrderByCreatedAtDesc(Role role, ApprovalStatus status);
}
