package com.sewasathi.service;

import com.sewasathi.dto.response.AdminOverviewResponse;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.PendingWorkerResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;

    public AdminOverviewResponse getOverview() {
        long totalUsers = userRepository.count();
        long totalWorkers = userRepository.countByRole(Role.WORKER);
        long totalCustomers = userRepository.countByRole(Role.CUSTOMER);
        long pendingVerifications = userRepository.countByRoleAndStatus(Role.WORKER, ApprovalStatus.PENDING);
        return new AdminOverviewResponse(totalUsers, totalWorkers, totalCustomers, pendingVerifications);
    }

    public List<PendingWorkerResponse> listPendingWorkers() {
        return userRepository.findByRoleAndStatusOrderByCreatedAtAsc(Role.WORKER, ApprovalStatus.PENDING).stream()
                .map(user -> PendingWorkerResponse.from(user, workerProfileRepository.findByUserId(user.getId()).orElse(null)))
                .toList();
    }

    public List<AdminUserResponse> listUsers(Role roleFilter, ApprovalStatus statusFilter) {
        return userRepository.findAll().stream()
                .filter(user -> roleFilter == null || user.getRole() == roleFilter)
                .filter(user -> statusFilter == null || user.getStatus() == statusFilter)
                .map(AdminUserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse approveWorker(Long userId) {
        User user = getWorkerOrThrow(userId);
        user.setStatus(ApprovalStatus.APPROVED);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse rejectWorker(Long userId) {
        User user = getWorkerOrThrow(userId);
        user.setStatus(ApprovalStatus.REJECTED);
        return UserResponse.from(userRepository.save(user));
    }

    private User getWorkerOrThrow(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No user with id " + userId));
        if (user.getRole() != Role.WORKER) {
            throw new InvalidOperationException("User " + userId + " is not a worker");
        }
        return user;
    }

    @Transactional
    public AdminUserResponse suspendUser(Long userId) {
        User user = getSuspendableUserOrThrow(userId);
        user.setSuspended(true);
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse unsuspendUser(Long userId) {
        User user = getSuspendableUserOrThrow(userId);
        user.setSuspended(false);
        return AdminUserResponse.from(userRepository.save(user));
    }

    private User getSuspendableUserOrThrow(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No user with id " + userId));
        if (user.getRole() == Role.ADMIN) {
            throw new InvalidOperationException("Admin accounts cannot be suspended");
        }
        return user;
    }
}
