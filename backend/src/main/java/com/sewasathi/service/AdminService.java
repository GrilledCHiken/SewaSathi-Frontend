package com.sewasathi.service;

import com.sewasathi.dto.response.AdminAnalyticsResponse;
import com.sewasathi.dto.response.AdminOverviewResponse;
import com.sewasathi.dto.response.AdminUserDetailResponse;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.PendingWorkerResponse;
import com.sewasathi.dto.response.RevenueTotals;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    /** How many entries the "top service categories" and "top locations" lists carry. */
    private static final int TOP_N = 5;

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final TaskRepository taskRepository;
    private final PaymentRepository paymentRepository;

    /**
     * The live figures behind the analytics dashboard, all measured over the same window.
     *
     * @param from inclusive start; defaults to a year back when the caller sends nothing
     * @param to   inclusive end - widened to the end of that day, so "to = today" counts
     *             everything recorded today
     */
    public AdminAnalyticsResponse getAnalytics(LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate begin = from != null ? from : end.minusYears(1);
        if (begin.isAfter(end)) {
            throw new IllegalArgumentException("The start date must not be after the end date");
        }

        LocalDateTime start = begin.atStartOfDay();
        // Exclusive upper bound at the start of the following day, matching ReportService, so
        // the dashboard and a report over the same range cannot disagree by a day.
        LocalDateTime stop = end.plusDays(1).atStartOfDay();

        RevenueTotals money = paymentRepository.totalsBetween(PaymentStatus.COMPLETED, start, stop);

        return new AdminAnalyticsResponse(
                begin,
                end,
                taskRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, stop),
                money.getGrossValue(),
                money.getPlatformFees(),
                money.getPaymentCount(),
                userRepository.countByRoleNotAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        Role.ADMIN, start, stop),
                taskRepository.topCategories(start, stop, Limit.of(TOP_N)),
                taskRepository.topLocations(start, stop, Limit.of(TOP_N)));
    }

    public AdminOverviewResponse getOverview() {
        long totalWorkers = userRepository.countByRole(Role.WORKER);
        long totalCustomers = userRepository.countByRole(Role.CUSTOMER);
        // Bootstrap administrators are not platform users, so counting them here would leave
        // the headline figure permanently ahead of the directory it summarises.
        long totalUsers = totalCustomers + totalWorkers;
        long pendingVerifications = listPendingWorkers().size();
        return new AdminOverviewResponse(totalUsers, totalWorkers, totalCustomers, pendingVerifications);
    }

    public List<PendingWorkerResponse> listPendingWorkers() {
        return userRepository.findByRoleAndStatusOrderByCreatedAtAsc(Role.WORKER, ApprovalStatus.PENDING).stream()
                .map(user -> workerProfileRepository.findByUserId(user.getId())
                        .map(profile -> PendingWorkerResponse.from(user, profile))
                        .orElse(null))
                .filter(response -> response != null && response.getVerificationSubmittedAt() != null)
                .toList();
    }

    /**
     * The account directory.
     *
     * <p>Administrators are kept out of the unfiltered listing: they are created by
     * {@code AdminBootstrap} rather than by signing up, so mixing them in with the people who
     * actually use the platform makes the directory read wrong. Asking for them by role still
     * returns them, which is what the console's Admin filter does.
     */
    public List<AdminUserResponse> listUsers(Role roleFilter, ApprovalStatus statusFilter) {
        return userRepository.findAll().stream()
                .filter(user -> roleFilter != null
                        ? user.getRole() == roleFilter
                        : user.getRole() != Role.ADMIN)
                .filter(user -> statusFilter == null || user.getStatus() == statusFilter)
                .map(AdminUserResponse::from)
                .toList();
    }

    /**
     * One account in full, including the worker profile when there is one.
     *
     * <p>Administrator accounts read as missing rather than forbidden: the directory hides them,
     * and a distinct answer here would confirm that an id belongs to an administrator.
     */
    public AdminUserDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .filter(candidate -> candidate.getRole() != Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("No user with id " + userId));

        WorkerProfile profile = user.getRole() == Role.WORKER
                ? workerProfileRepository.findByUserId(user.getId()).orElse(null)
                : null;

        return AdminUserDetailResponse.from(user, profile);
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
