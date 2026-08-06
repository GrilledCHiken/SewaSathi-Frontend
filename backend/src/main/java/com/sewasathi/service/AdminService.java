package com.sewasathi.service;

import com.sewasathi.config.ContactProperties;
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
import com.sewasathi.repository.ContactMessageRepository;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AdminService {

    /** How many entries the "top service categories" and "top locations" lists carry. */
    private static final int TOP_N = 5;

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final TaskRepository taskRepository;
    private final PaymentRepository paymentRepository;
    private final ContactMessageRepository contactMessageRepository;
    private final FileStorageService fileStorageService;
    private final EmailService emailService;
    private final ContactProperties contactProperties;
    private final String frontendUrl;

    // Written out rather than left to @RequiredArgsConstructor because the @Value parameter
    // below needs the annotation on the constructor argument, and Lombok does not copy it
    // there. PaymentService does the same for the same reason.
    @Autowired
    public AdminService(
            UserRepository userRepository,
            WorkerProfileRepository workerProfileRepository,
            TaskRepository taskRepository,
            PaymentRepository paymentRepository,
            ContactMessageRepository contactMessageRepository,
            FileStorageService fileStorageService,
            EmailService emailService,
            ContactProperties contactProperties,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.userRepository = userRepository;
        this.workerProfileRepository = workerProfileRepository;
        this.taskRepository = taskRepository;
        this.paymentRepository = paymentRepository;
        this.contactMessageRepository = contactMessageRepository;
        this.fileStorageService = fileStorageService;
        this.emailService = emailService;
        this.contactProperties = contactProperties;
        this.frontendUrl = trimTrailingSlash(frontendUrl);
    }

    private static String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

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
        long pendingClearanceRenewals = listClearanceRenewals().size();
        long newInquiries = contactMessageRepository.countByHandledFalse();
        return new AdminOverviewResponse(
                totalUsers, totalWorkers, totalCustomers, pendingVerifications,
                pendingClearanceRenewals, newInquiries);
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
     * Workers who have handed in a replacement police clearance report, which the six-month
     * renewal rule makes a recurring event rather than a one-off.
     *
     * <p>Unlike {@link #listPendingWorkers()} this is not a list of PENDING accounts: the people
     * here are approved and working, and stay that way while their new report is looked at.
     */
    public List<PendingWorkerResponse> listClearanceRenewals() {
        return workerProfileRepository
                .findByPendingPoliceClearanceUrlIsNotNullOrderByPendingPoliceClearanceUploadedAtAsc()
                .stream()
                .map(profile -> PendingWorkerResponse.from(profile.getUser(), profile))
                .toList();
    }

    /**
     * Accepts a replacement police clearance report: the new file becomes the one on record and
     * its upload date restarts the six-month window. The superseded file is deleted, since
     * nothing references it any more and it is an identity document.
     */
    @Transactional
    public UserResponse approveClearanceRenewal(Long userId) {
        User user = getWorkerOrThrow(userId);
        WorkerProfile profile = getRenewalOrThrow(user.getId());

        String superseded = profile.getPoliceClearanceUrl();
        profile.setPoliceClearanceUrl(profile.getPendingPoliceClearanceUrl());
        profile.setPoliceClearanceUploadedAt(profile.getPendingPoliceClearanceUploadedAt());
        clearRenewal(profile);

        if (superseded != null) {
            fileStorageService.delete(superseded);
        }
        return UserResponse.from(user);
    }

    /**
     * Turns a replacement report down. The report already on record stands, expiry and all, so a
     * worker whose renewal is rejected is back where they were and can upload another.
     */
    @Transactional
    public UserResponse rejectClearanceRenewal(Long userId) {
        User user = getWorkerOrThrow(userId);
        WorkerProfile profile = getRenewalOrThrow(user.getId());

        String rejected = profile.getPendingPoliceClearanceUrl();
        clearRenewal(profile);

        fileStorageService.delete(rejected);
        return UserResponse.from(user);
    }

    private WorkerProfile getRenewalOrThrow(Long userId) {
        WorkerProfile profile = workerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No worker profile for user " + userId));
        if (profile.getPendingPoliceClearanceUrl() == null) {
            throw new InvalidOperationException(
                    "Worker " + userId + " has no police clearance renewal waiting for review");
        }
        return profile;
    }

    private void clearRenewal(WorkerProfile profile) {
        profile.setPendingPoliceClearanceUrl(null);
        profile.setPendingPoliceClearanceUploadedAt(null);
        workerProfileRepository.save(profile);
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

    /**
     * Lets a worker start taking jobs, and tells them so. The decision is the point of the
     * call; the email is best-effort, for the same reason suspension's is - see
     * {@link #send(User, String, String, Map)}.
     */
    @Transactional
    public UserResponse approveWorker(Long userId) {
        User user = getWorkerOrThrow(userId);
        user.setStatus(ApprovalStatus.APPROVED);
        // An approved worker must not keep the reason from an earlier rejection: it would
        // resurface in their banner and in any later rejection email, describing something
        // that was already put right.
        user.setRejectionReason(null);
        User saved = userRepository.save(user);
        notifyApproved(saved);
        return UserResponse.from(saved);
    }

    /**
     * Turns an application down. The reason is stored as well as sent, because the banner the
     * worker sees at their next sign-in repeats it - see {@code WorkerLayout} on the client.
     */
    @Transactional
    public UserResponse rejectWorker(Long userId, String reason) {
        User user = getWorkerOrThrow(userId);
        user.setStatus(ApprovalStatus.REJECTED);
        user.setRejectionReason(reason.trim());
        User saved = userRepository.save(user);
        notifyRejected(saved, saved.getRejectionReason());
        return UserResponse.from(saved);
    }

    private boolean notifyApproved(User user) {
        return send(user, "Your Sewa Sathi worker application has been approved",
                "email/worker-approved",
                Map.of(
                        "name", firstName(user.getFullName()),
                        "loginUrl", frontendUrl + "/login"));
    }

    private boolean notifyRejected(User user, String reason) {
        return send(user, "An update on your Sewa Sathi worker application",
                "email/worker-rejected",
                Map.of(
                        "name", firstName(user.getFullName()),
                        // The admin's own words, unedited - the same text fills the banner.
                        "reason", reason,
                        "supportEmail", contactProperties.getSupportEmail()));
    }

    private User getWorkerOrThrow(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No user with id " + userId));
        if (user.getRole() != Role.WORKER) {
            throw new InvalidOperationException("User " + userId + " is not a worker");
        }
        return user;
    }

    /**
     * Locks the account out and tells its owner why. The reason is stored as well as sent,
     * because the sign-in attempt that follows repeats it - see
     * {@link com.sewasathi.exception.SuspendedAccountException}.
     */
    @Transactional
    public AdminUserResponse suspendUser(Long userId, String reason) {
        User user = getSuspendableUserOrThrow(userId);
        user.setSuspended(true);
        user.setSuspensionReason(reason);
        User saved = userRepository.save(user);
        return AdminUserResponse.from(saved, notifySuspended(saved, reason));
    }

    @Transactional
    public AdminUserResponse unsuspendUser(Long userId, String note) {
        User user = getSuspendableUserOrThrow(userId);
        user.setSuspended(false);
        // A restored account must not keep the old reason: it would resurface in the 403 the
        // next time anything suspends them, describing something that was already resolved.
        user.setSuspensionReason(null);
        User saved = userRepository.save(user);
        return AdminUserResponse.from(saved, notifyRestored(saved, note));
    }

    private boolean notifySuspended(User user, String reason) {
        return send(user, "Your Sewa Sathi account has been suspended", "email/account-suspended",
                Map.of(
                        "name", firstName(user.getFullName()),
                        "reason", reason,
                        "supportEmail", contactProperties.getSupportEmail()));
    }

    private boolean notifyRestored(User user, String note) {
        return send(user, "Your Sewa Sathi account has been restored", "email/account-restored",
                Map.of(
                        "name", firstName(user.getFullName()),
                        // Normalised to "" rather than left null: Map.of rejects nulls, and the
                        // template drops the paragraph on an empty string either way.
                        "note", note == null ? "" : note.trim(),
                        "loginUrl", frontendUrl + "/login"));
    }

    /**
     * The one place this service swallows an exception, and deliberately so: an admin decision -
     * a suspension, or approving or rejecting a worker - must not hinge on the mail server being
     * reachable. Catching here - rather than letting
     * {@link com.sewasathi.exception.EmailDeliveryException} escape the transactional proxy - is
     * what keeps Spring from marking the transaction rollback-only, so the decision sticks and,
     * where the caller passes the flag on, the admin is told the notice did not go out.
     */
    private boolean send(User user, String subject, String template, Map<String, Object> model) {
        try {
            emailService.sendTemplate(user.getEmail(), subject, template, model);
            return true;
        } catch (RuntimeException ex) {
            log.warn("Could not email {} about their account status: {}", user.getEmail(), ex.getMessage());
            return false;
        }
    }

    private String firstName(String fullName) {
        String trimmed = fullName == null ? "" : fullName.trim();
        int space = trimmed.indexOf(' ');
        return space > 0 ? trimmed.substring(0, space) : trimmed;
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
