package com.sewasathi.controller;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The approve/reject endpoints behind the React admin's verification queue.
 *
 * <p>What is worth pinning here is the reason: it is emailed to the applicant and repeated in the
 * banner they get at their next sign-in, so a rejection that carries none would leave them shut
 * out with nothing to act on. The endpoint refuses one rather than inventing wording.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminWorkerDecisionEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private User worker;

    @BeforeEach
    void seedAPendingWorker() {
        // The context is shared across tests, so the account needs a unique email.
        long unique = System.nanoTime();

        worker = userRepository.save(User.builder()
                .email("decision-worker-" + unique + "@example.com")
                .passwordHash("x").fullName("Decision Worker").phone("9800000061")
                .role(Role.WORKER).status(ApprovalStatus.PENDING).build());
    }

    private ApprovalStatus statusOnRecord() {
        return userRepository.findById(worker.getId()).orElseThrow().getStatus();
    }

    @Test
    void rejecting_withAReason_recordsItAndReturnsItToTheAdmin() throws Exception {
        String reason = "The citizenship document is cropped - please send the whole page.";

        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/reject")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"" + reason + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value(reason));

        assertThat(userRepository.findById(worker.getId()).orElseThrow().getRejectionReason())
                .isEqualTo(reason);
    }

    @Test
    void rejecting_withABlankReason_isRefused() throws Exception {
        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/reject")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(statusOnRecord())
                .as("a refused request must not have decided anything")
                .isEqualTo(ApprovalStatus.PENDING);
    }

    @Test
    void rejecting_withNoReasonField_isRefused() throws Exception {
        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/reject")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        assertThat(statusOnRecord()).isEqualTo(ApprovalStatus.PENDING);
    }

    /** Approving needs no reason - there is nothing to explain. */
    @Test
    void approving_takesNoBody() throws Exception {
        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/approve")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        assertThat(statusOnRecord()).isEqualTo(ApprovalStatus.APPROVED);
    }
}
