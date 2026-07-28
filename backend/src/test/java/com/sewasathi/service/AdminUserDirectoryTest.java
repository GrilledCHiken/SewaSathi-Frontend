package com.sewasathi.service;

import com.sewasathi.dto.response.AdminUserDetailResponse;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    // ---------- the directory ----------

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

    // ---------- one account in full ----------

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
}
