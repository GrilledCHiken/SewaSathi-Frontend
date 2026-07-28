package com.sewasathi.controller;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The user-detail endpoint behind the admin console's View Details modal: that it is reachable
 * only by an administrator, and that a worker's profile and documents come back with it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUserDetailEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    private User worker;
    private User admin;

    @BeforeEach
    void seedAccounts() {
        long unique = System.nanoTime();

        worker = userRepository.save(User.builder()
                .email("detail-worker-" + unique + "@example.com")
                .passwordHash("x").fullName("Detail Worker").phone("9800000041")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build());

        workerProfileRepository.save(WorkerProfile.builder()
                .user(worker)
                .skills("Plumbing")
                .hourlyRate(new BigDecimal("700.00"))
                .location("Kathmandu")
                .citizenshipDocUrl("/uploads/detail-citizenship-" + unique + ".jpg")
                .build());

        admin = userRepository.save(User.builder()
                .email("detail-admin-" + unique + "@example.com")
                .passwordHash("x").fullName("Detail Admin").phone("9800000042")
                .role(Role.ADMIN).status(ApprovalStatus.APPROVED).build());
    }

    @Test
    void anAdmin_getsTheWorkerProfileWithTheAccount() throws Exception {
        mockMvc.perform(get("/api/admin/users/" + worker.getId())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Detail Worker"))
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(jsonPath("$.workerProfile.skills").value("Plumbing"))
                .andExpect(jsonPath("$.workerProfile.location").value("Kathmandu"))
                .andExpect(jsonPath("$.workerProfile.citizenshipDocUrl").isNotEmpty());
    }

    @Test
    void anAdministratorsOwnAccount_isNotReachableThroughTheDirectory() throws Exception {
        mockMvc.perform(get("/api/admin/users/" + admin.getId())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void aNonAdmin_isRefused() throws Exception {
        mockMvc.perform(get("/api/admin/users/" + worker.getId())
                        .with(user("worker").roles("WORKER")))
                .andExpect(status().isForbidden());
    }
}
