package com.sewasathi.controller;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.PoliceClearanceStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import com.sewasathi.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The six-month police clearance renewal, end to end.
 *
 * <p>Renewing costs the worker nothing while it is checked: the report is parked in the
 * profile's pending columns, they stay APPROVED, and only an admin approving it swaps the
 * document on record and restarts the clock. Also pins the access rule on the new file - a
 * pending report is an identity document, readable by its owner and admins only.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkerPoliceClearanceRenewalTest {

    /** A real PDF header, because FileStorageService checks the bytes against the declared type. */
    private static final byte[] PDF_BYTES =
            "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    private User worker;
    private User otherWorker;
    private String originalReportUrl;

    @BeforeEach
    void seedAnApprovedWorkerWithAnAgeingReport() {
        long unique = System.nanoTime();
        originalReportUrl = "/uploads/original-clearance-" + unique + ".pdf";

        worker = userRepository.save(User.builder()
                .email("renewal-worker-" + unique + "@example.com")
                .passwordHash("x").fullName("Renewal Worker").phone("9800000051")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build());

        workerProfileRepository.save(WorkerProfile.builder()
                .user(worker)
                .skills("Plumbing")
                .location("Kathmandu")
                .policeClearanceUrl(originalReportUrl)
                // Five months old: inside its six months, so nothing here depends on it expiring.
                .policeClearanceUploadedAt(LocalDateTime.now().minusMonths(5))
                .citizenshipDocUrl("/uploads/renewal-citizenship-" + unique + ".jpg")
                .verificationSubmittedAt(LocalDateTime.now().minusMonths(5))
                .build());

        otherWorker = userRepository.save(User.builder()
                .email("renewal-other-" + unique + "@example.com")
                .passwordHash("x").fullName("Other Worker").phone("9800000052")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build());
    }

    /** The controllers read the caller's email off a UserPrincipal, so tests have to supply one. */
    private static RequestPostProcessor as(User account) {
        UserPrincipal principal = new UserPrincipal(account);
        return authentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
    }

    private void uploadRenewal() throws Exception {
        mockMvc.perform(multipart("/api/worker/profile/police-clearance")
                        .file(new MockMultipartFile(
                                "policeClearance", "renewal.pdf", "application/pdf", PDF_BYTES))
                        .with(as(worker)))
                .andExpect(status().isOk());
    }

    private WorkerProfile reload() {
        return workerProfileRepository.findByUserId(worker.getId()).orElseThrow();
    }

    private static String filenameOf(String storedUrl) {
        return storedUrl.substring(storedUrl.lastIndexOf('/') + 1);
    }

    @Test
    void uploading_parksTheReportForReviewAndLeavesTheOneOnFileAlone() throws Exception {
        mockMvc.perform(multipart("/api/worker/profile/police-clearance")
                        .file(new MockMultipartFile(
                                "policeClearance", "renewal.pdf", "application/pdf", PDF_BYTES))
                        .with(as(worker)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policeClearanceUrl").value(originalReportUrl))
                .andExpect(jsonPath("$.pendingPoliceClearanceUrl").isNotEmpty())
                .andExpect(jsonPath("$.policeClearanceStatus").value("RENEWAL_PENDING"));

        // The whole point: the worker is not knocked back to PENDING and keeps working.
        assertThat(userRepository.findById(worker.getId()).orElseThrow().getStatus())
                .isEqualTo(ApprovalStatus.APPROVED);
    }

    @Test
    void aWorkerWithNoReportOnFile_isSentToVerificationInstead() throws Exception {
        workerProfileRepository.save(WorkerProfile.builder()
                .user(otherWorker).skills("Painting").build());

        mockMvc.perform(multipart("/api/worker/profile/police-clearance")
                        .file(new MockMultipartFile(
                                "policeClearance", "renewal.pdf", "application/pdf", PDF_BYTES))
                        .with(as(otherWorker)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theWorkerCanOpenTheReportTheyJustUploaded() throws Exception {
        uploadRenewal();

        mockMvc.perform(get("/api/files/" + filenameOf(reload().getPendingPoliceClearanceUrl()))
                        .with(as(worker)))
                .andExpect(status().isOk());
    }

    @Test
    void anotherWorker_cannotOpenSomebodyElsesPendingReport() throws Exception {
        uploadRenewal();

        // Denials are reported as "not found" so probing cannot confirm a filename exists.
        mockMvc.perform(get("/api/files/" + filenameOf(reload().getPendingPoliceClearanceUrl()))
                        .with(as(otherWorker)))
                .andExpect(status().isNotFound());
    }

    @Test
    void theRenewalShowsUpInTheAdminQueue() throws Exception {
        uploadRenewal();

        mockMvc.perform(get("/api/admin/workers/clearance-renewals")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + worker.getId() + ")].pendingPoliceClearanceUrl")
                        .isNotEmpty());
    }

    @Test
    void approving_promotesTheNewReportAndRestartsTheSixMonths() throws Exception {
        uploadRenewal();
        String submitted = reload().getPendingPoliceClearanceUrl();

        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/clearance/approve")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        WorkerProfile profile = reload();
        assertThat(profile.getPoliceClearanceUrl()).isEqualTo(submitted);
        assertThat(profile.getPendingPoliceClearanceUrl()).isNull();
        assertThat(profile.getPendingPoliceClearanceUploadedAt()).isNull();
        assertThat(profile.getPoliceClearanceStatus()).isEqualTo(PoliceClearanceStatus.VALID);
        assertThat(profile.getPoliceClearanceExpiresAt())
                .isAfter(LocalDateTime.now().plusMonths(5).plusDays(25));
    }

    @Test
    void rejecting_leavesThePreviousReportAndItsExpiryStanding() throws Exception {
        uploadRenewal();
        LocalDateTime expiryBefore = reload().getPoliceClearanceExpiresAt();

        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/clearance/reject")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        WorkerProfile profile = reload();
        assertThat(profile.getPoliceClearanceUrl()).isEqualTo(originalReportUrl);
        assertThat(profile.getPendingPoliceClearanceUrl()).isNull();
        assertThat(profile.getPoliceClearanceExpiresAt()).isEqualTo(expiryBefore);
    }

    @Test
    void approvingWithNothingToReview_isRefused() throws Exception {
        mockMvc.perform(patch("/api/admin/workers/" + worker.getId() + "/clearance/approve")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());
    }
}
