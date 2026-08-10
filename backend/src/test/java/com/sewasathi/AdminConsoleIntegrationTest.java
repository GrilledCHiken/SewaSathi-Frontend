package com.sewasathi;

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
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

/**
 * Covers the server-rendered admin console: that its Thymeleaf views actually render
 * (requirement #4), that its session chain is separate from and stricter than the API chain
 * (#2), and that CSRF is enforced on every mutation (#7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminConsoleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Long customerId;

    @BeforeEach
    void createSuspendableCustomer() {
        String email = "console-customer-" + System.nanoTime() + "@example.com";
        User customer = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("ConsolePass1!"))
                .fullName("Console Customer")
                .phone("9800000077")
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .build());
        customerId = customer.getId();
    }

    @Test
    void loginPage_rendersForAnonymousVisitors() throws Exception {
        mockMvc.perform(get("/admin/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/login"))
                .andExpect(content().contentTypeCompatibleWith("text/html"));
    }

    @Test
    void dashboard_rendersOverviewForAnAdmin() throws Exception {
        mockMvc.perform(get("/admin/dashboard").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/dashboard"))
                .andExpect(model().attributeExists("overview", "pendingWorkers"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Total users")));
    }

    @Test
    void userAndWorkerPages_render() throws Exception {
        mockMvc.perform(get("/admin/users").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/users"))
                .andExpect(model().attributeExists("users", "roles", "statuses"));

        mockMvc.perform(get("/admin/workers").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/workers"));
    }

    /**
     * The console loads its own stylesheet and script, which the API chain's
     * {@code default-src 'none'; sandbox} policy would block outright.
     */
    @Test
    void adminPages_useTheirOwnContentSecurityPolicy() throws Exception {
        mockMvc.perform(get("/admin/dashboard").with(user("admin").roles("ADMIN")))
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.containsString("default-src 'self'")));

        mockMvc.perform(get("/api/auth/providers"))
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.containsString("default-src 'none'")));
    }

    @Test
    void dashboard_anonymously_redirectsToTheLoginPage() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/login"));
    }

    @Test
    void dashboard_asANonAdmin_isForbidden() throws Exception {
        mockMvc.perform(get("/admin/dashboard").with(user("someone").roles("CUSTOMER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void deniedPage_explainsTheRefusalInsteadOfBouncingToLogin() throws Exception {
        mockMvc.perform(get("/admin/denied").with(user("someone").roles("CUSTOMER")))
                .andExpect(status().isForbidden())
                .andExpect(view().name("error/403"))
                .andExpect(content().contentTypeCompatibleWith("text/html"));
    }

    // CSRF (requirement #7)

    /**
     * Models what a forged request actually looks like: the admin has a live session (they
     * loaded a page, so the session holds a CSRF token) and a POST arrives on that session
     * without the matching token.
     *
     * <p>Going straight to the POST on a brand-new session would test something else - with
     * no token stored yet Spring Security reads it as an expired session and redirects to
     * the login page rather than refusing outright.
     */
    @Test
    void adminApiMutation_withoutACsrfToken_isForbidden() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(get("/admin/dashboard").session(session).with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/admin/api/users/" + customerId + "/suspend")
                        .session(session)
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Testing CSRF\"}"))
                .andExpect(status().isForbidden());

        assertThat(userRepository.findById(customerId).orElseThrow().isSuspended())
                .as("a request without a CSRF token must not have changed anything")
                .isFalse();
    }

    @Test
    void adminApiMutation_withACsrfToken_succeeds() throws Exception {
        mockMvc.perform(post("/admin/api/users/" + customerId + "/suspend")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Repeated no-shows on confirmed bookings.\"}"))
                .andExpect(status().isOk());

        User suspended = userRepository.findById(customerId).orElseThrow();
        assertThat(suspended.isSuspended()).isTrue();
        assertThat(suspended.getSuspensionReason()).isEqualTo("Repeated no-shows on confirmed bookings.");

        // No body at all: the note is optional, so restoring must still go through.
        mockMvc.perform(post("/admin/api/users/" + customerId + "/unsuspend")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isOk());

        User restored = userRepository.findById(customerId).orElseThrow();
        assertThat(restored.isSuspended()).isFalse();
        assertThat(restored.getSuspensionReason()).isNull();
    }

    /** The reason is what the account holder is told, so a suspension without one is refused. */
    @Test
    void suspending_withoutAReason_isRejected() throws Exception {
        mockMvc.perform(post("/admin/api/users/" + customerId + "/suspend")
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(userRepository.findById(customerId).orElseThrow().isSuspended()).isFalse();
    }

    /**
     * The API chain authenticates from a bearer token, never a cookie, so requiring a CSRF
     * token there would break every SPA call without protecting anything.
     */
    @Test
    void apiChain_remainsCsrfFree() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"nobody@example.com\",\"password\":\"WrongPass1!\"}"))
                .andExpect(status().isUnauthorized());
    }

    // reports (requirement #14)

    @Test
    void reportsPage_listsEveryReport() throws Exception {
        mockMvc.perform(get("/admin/reports").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/reports"))
                .andExpect(model().attributeExists("reportTypes", "formats"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Revenue by month")));
    }

    @Test
    void consoleServesAReportAsADownload() throws Exception {
        mockMvc.perform(get("/admin/reports/revenue")
                        .param("format", "pdf")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")));
    }

    /**
     * The slug reaches a classpath lookup, so it must not be usable to walk out of the
     * reports directory.
     */
    @Test
    void anUnknownReportSlugIsRejected() throws Exception {
        mockMvc.perform(get("/admin/reports/{slug}", "../application")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void reportEndpointsAreAdminOnly() throws Exception {
        mockMvc.perform(get("/admin/reports/revenue").with(user("someone").roles("CUSTOMER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/reports"))
                .andExpect(status().isUnauthorized());
    }

    // error pages (requirement #8)

    @Test
    void unknownAdminPath_rendersTheStyledNotFoundPage() throws Exception {
        mockMvc.perform(get("/admin/no-such-page").with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }
}
