package com.sewasathi.service;

import com.sewasathi.dto.response.AdminUserDetailResponse;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.EmailDeliveryException;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Covers the admin console's account directory: that administrators stay out of it, and that
 * opening one account returns enough to review it - the worker profile and the identity
 * documents included, since those are otherwise only reachable while a worker is pending.
 */
@SpringBootTest
@ActiveProfiles("test")
class AdminUserDirectoryTest {

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    // Spied rather than mocked so ConsoleEmailService still renders each template: a broken
    // Thymeleaf expression in one of these emails fails here rather than in someone's inbox.
    @MockitoSpyBean
    private EmailService emailService;

    private User customer;
    private User worker;
    private User admin;

    @BeforeEach
    void seedAccounts() {
        // The context is shared across tests, so every account needs a unique email.
        long unique = System.nanoTime();

        customer = userRepository.save(User.builder()
                .email("directory-customer-" + unique + "@example.com")
                .passwordHash("x").fullName("Directory Customer").phone("9800000030")
                .role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).build());

        worker = userRepository.save(User.builder()
                .email("directory-worker-" + unique + "@example.com")
                .passwordHash("x").fullName("Directory Worker").phone("9800000031")
                .avatarUrl("/uploads/directory-avatar-" + unique + ".jpg")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build());

        workerProfileRepository.save(WorkerProfile.builder()
                .user(worker)
                .skills("Plumbing, Electrical")
                .hourlyRate(new BigDecimal("850.00"))
                .location("Pokhara").address("Lakeside")
                .yearsOfExperience("5 years").bio("Seeded for the directory test")
                .ratingAverage(new BigDecimal("4.50")).ratingCount(12).tasksCompleted(30)
                .policeClearanceUrl("/uploads/directory-police-" + unique + ".pdf")
                .citizenshipDocUrl("/uploads/directory-citizenship-" + unique + ".jpg")
                .profilePhotoUrl("/uploads/directory-photo-" + unique + ".jpg")
                .verificationSubmittedAt(LocalDateTime.now())
                .build());

        admin = userRepository.save(User.builder()
                .email("directory-admin-" + unique + "@example.com")
                .passwordHash("x").fullName("Directory Admin").phone("9800000032")
                .role(Role.ADMIN).status(ApprovalStatus.APPROVED).build());
    }

    @Test
    void listUsers_leavesAdministratorsOut() {
        List<AdminUserResponse> users = adminService.listUsers(null, null);

        assertThat(users).extracting(AdminUserResponse::getRole).doesNotContain(Role.ADMIN);
        assertThat(users).extracting(AdminUserResponse::getId).doesNotContain(admin.getId());
    }

    @Test
    void listUsers_stillReturnsCustomersAndWorkers() {
        List<AdminUserResponse> users = adminService.listUsers(null, null);

        assertThat(users).extracting(AdminUserResponse::getId)
                .contains(customer.getId(), worker.getId());
    }

    @Test
    void listUsers_appliesRoleAndStatusFiltersOnTopOfTheAdminExclusion() {
        List<AdminUserResponse> workers = adminService.listUsers(Role.WORKER, ApprovalStatus.APPROVED);

        assertThat(workers).extracting(AdminUserResponse::getId).contains(worker.getId());
        assertThat(workers).extracting(AdminUserResponse::getRole).containsOnly(Role.WORKER);
    }

    @Test
    void getUserDetail_forAWorker_carriesTheProfileAndDocuments() {
        AdminUserDetailResponse detail = adminService.getUserDetail(worker.getId());

        assertThat(detail.getFullName()).isEqualTo("Directory Worker");
        assertThat(detail.getAvatarUrl()).isEqualTo(worker.getAvatarUrl());

        AdminUserDetailResponse.WorkerProfileDetail profile = detail.getWorkerProfile();
        assertThat(profile).isNotNull();
        assertThat(profile.getSkills()).isEqualTo("Plumbing, Electrical");
        assertThat(profile.getHourlyRate()).isEqualByComparingTo("850.00");
        assertThat(profile.getLocation()).isEqualTo("Pokhara");
        assertThat(profile.getYearsOfExperience()).isEqualTo("5 years");
        // Both halves of the union: the counters and the documents.
        assertThat(profile.getRatingCount()).isEqualTo(12);
        assertThat(profile.getTasksCompleted()).isEqualTo(30);
        assertThat(profile.getPoliceClearanceUrl()).isNotBlank();
        assertThat(profile.getCitizenshipDocUrl()).isNotBlank();
        assertThat(profile.getVerificationSubmittedAt()).isNotNull();
    }

    @Test
    void getUserDetail_forACustomer_hasNoWorkerProfile() {
        AdminUserDetailResponse detail = adminService.getUserDetail(customer.getId());

        assertThat(detail.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(detail.getEmail()).isEqualTo(customer.getEmail());
        assertThat(detail.getWorkerProfile()).isNull();
    }

    @Test
    void getUserDetail_forAnAdministrator_readsAsMissing() {
        // Not "forbidden": the directory hides these accounts, so a different answer here
        // would confirm the id belongs to an administrator.
        assertThatThrownBy(() -> adminService.getUserDetail(admin.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getUserDetail_forAnUnknownId_readsAsMissing() {
        assertThatThrownBy(() -> adminService.getUserDetail(-1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void suspendUser_storesTheReasonAndEmailsIt() {
        String reason = "Repeated no-shows on confirmed bookings on 2 and 5 August.";

        AdminUserResponse response = adminService.suspendUser(worker.getId(), reason);

        assertThat(response.isSuspended()).isTrue();
        assertThat(response.getSuspensionReason()).isEqualTo(reason);
        assertThat(response.getEmailSent()).isTrue();
        assertThat(userRepository.findById(worker.getId()).orElseThrow().getSuspensionReason())
                .as("the reason is stored, because the login 403 repeats it")
                .isEqualTo(reason);

        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(
                eq(worker.getEmail()), anyString(), eq("email/account-suspended"), model.capture());
        assertThat(model.getValue().get("reason")).isEqualTo(reason);
        assertThat(model.getValue().get("name")).isEqualTo("Directory");
    }

    @Test
    void unsuspendUser_clearsTheReasonAndSendsTheReinstatement() {
        adminService.suspendUser(customer.getId(), "Chargeback under investigation.");

        AdminUserResponse response = adminService.unsuspendUser(customer.getId(), "Resolved with the bank.");

        assertThat(response.isSuspended()).isFalse();
        assertThat(response.getSuspensionReason()).isNull();
        assertThat(response.getEmailSent()).isTrue();
        assertThat(userRepository.findById(customer.getId()).orElseThrow().getSuspensionReason())
                .as("a restored account must not keep a reason that no longer applies")
                .isNull();

        verify(emailService).sendTemplate(
                eq(customer.getEmail()), anyString(), eq("email/account-restored"), any());
    }

    /**
     * The one that matters: suspension is a safety action, so it cannot be undone by the mail
     * server being unreachable. The admin is told the notice did not go out instead.
     */
    @Test
    void suspendUser_whenTheEmailCannotBeSent_stillSuspendsTheAccount() {
        doThrow(new EmailDeliveryException("smtp is down", new RuntimeException()))
                .when(emailService).sendTemplate(anyString(), anyString(), anyString(), any());

        AdminUserResponse response = adminService.suspendUser(worker.getId(), "Verification documents expired.");

        assertThat(response.isSuspended()).isTrue();
        assertThat(response.getEmailSent()).isFalse();
        assertThat(userRepository.findById(worker.getId()).orElseThrow().isSuspended())
                .as("an undeliverable email must not roll the suspension back")
                .isTrue();
    }

    @Test
    void suspendUser_refusesAdministrators() {
        assertThatThrownBy(() -> adminService.suspendUser(admin.getId(), "Any reason"))
                .isInstanceOf(InvalidOperationException.class);

        verifyNoInteractions(emailService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void approveWorker_letsThemInAndEmailsTheNews() {
        worker.setStatus(ApprovalStatus.PENDING);
        worker.setRejectionReason("An earlier rejection that no longer applies.");
        userRepository.save(worker);

        UserResponse response = adminService.approveWorker(worker.getId());

        assertThat(response.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(response.getRejectionReason())
                .as("an approved worker must not keep a reason that has been put right")
                .isNull();
        assertThat(userRepository.findById(worker.getId()).orElseThrow().getRejectionReason()).isNull();

        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(
                eq(worker.getEmail()), anyString(), eq("email/worker-approved"), model.capture());
        assertThat(model.getValue().get("name")).isEqualTo("Directory");
        assertThat((String) model.getValue().get("loginUrl")).endsWith("/login");
    }

    @Test
    @SuppressWarnings("unchecked")
    void rejectWorker_storesTheReasonAndEmailsIt() {
        String reason = "The police clearance report is unreadable - please send a clearer scan.";

        UserResponse response = adminService.rejectWorker(worker.getId(), "  " + reason + "  ");

        assertThat(response.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(response.getRejectionReason()).isEqualTo(reason);
        assertThat(userRepository.findById(worker.getId()).orElseThrow().getRejectionReason())
                .as("the reason is stored, because the worker's banner repeats it")
                .isEqualTo(reason);

        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(
                eq(worker.getEmail()), anyString(), eq("email/worker-rejected"), model.capture());
        assertThat(model.getValue().get("reason")).isEqualTo(reason);
        assertThat(model.getValue().get("name")).isEqualTo("Directory");
    }

    /** Same rule as suspension: the decision stands whether or not the mail server answers. */
    @Test
    void rejectWorker_whenTheEmailCannotBeSent_stillRecordsTheDecision() {
        doThrow(new EmailDeliveryException("smtp is down", new RuntimeException()))
                .when(emailService).sendTemplate(anyString(), anyString(), anyString(), any());

        UserResponse response = adminService.rejectWorker(worker.getId(), "Documents do not match.");

        assertThat(response.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        User stored = userRepository.findById(worker.getId()).orElseThrow();
        assertThat(stored.getStatus())
                .as("an undeliverable email must not roll the decision back")
                .isEqualTo(ApprovalStatus.REJECTED);
        assertThat(stored.getRejectionReason()).isEqualTo("Documents do not match.");
    }

    @Test
    void rejectWorker_refusesAccountsThatAreNotWorkers() {
        assertThatThrownBy(() -> adminService.rejectWorker(customer.getId(), "Any reason"))
                .isInstanceOf(InvalidOperationException.class);

        verifyNoInteractions(emailService);
    }
}
