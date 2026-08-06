package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The refresh flow over real HTTP (requirement #2): what a browser actually sees when a
 * short-lived access token runs out.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RefreshFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    /** Signing up now needs the emailed code, which SignupFlow reads back off this spy. */
    @MockitoSpyBean
    private EmailService emailService;

    private String email;
    private String password;

    @BeforeEach
    void registerACustomer() throws Exception {
        email = "refresh-flow-" + System.nanoTime() + "@example.com";
        password = "RefreshPass1!";

        SignupFlow.registerCustomer(mockMvc, emailService,
                "Refresh Flow", email, "9800000033", password);
    }

    private String[] signIn() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        return new String[] { JsonPath.read(body, "$.token"), JsonPath.read(body, "$.refreshToken") };
    }

    @Test
    void signingInReturnsBothTokens() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void refreshReturnsAWorkingNewPair() throws Exception {
        String[] tokens = signIn();

        MvcResult refreshed = mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(tokens[1])))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String newAccessToken = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.token");
        String newRefreshToken = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.refreshToken");

        assertThat(newRefreshToken)
                .as("rotation should hand back a different token")
                .isNotEqualTo(tokens[1]);

        mockMvc.perform(get("/api/tasks/mine").header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk());
    }

    /**
     * Refresh has to be reachable without a bearer token - by the time a client needs it,
     * the access token it would authenticate with has already expired.
     */
    @Test
    void refreshWorksWithoutAnAccessToken() throws Exception {
        String[] tokens = signIn();

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(tokens[1])))
                .andExpect(status().isOk());
    }

    @Test
    void aGarbageRefreshTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"not-a-real-token"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutRevokesTheRefreshTokenServerSide() throws Exception {
        String[] tokens = signIn();

        mockMvc.perform(post("/api/auth/logout")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(tokens[1])))
                .andExpect(status().isNoContent());

        // Forgetting the token client-side is not enough: it must stop working on the server.
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(tokens[1])))
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutEverywhereEndsSessionsOnAllDevices() throws Exception {
        String[] phone = signIn();
        String[] laptop = signIn();

        mockMvc.perform(post("/api/auth/logout-all")
                        .header("Authorization", "Bearer " + laptop[0]))
                .andExpect(status().isNoContent());

        for (String[] session : new String[][] { phone, laptop }) {
            mockMvc.perform(post("/api/auth/refresh")
                            .contentType("application/json")
                            .content("""
                                    {"refreshToken":"%s"}
                                    """.formatted(session[1])))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void logoutEverywhereRequiresAToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout-all"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * A replayed token means someone other than the real client is holding it, so the whole
     * chain goes - including the token the legitimate client is still using.
     */
    @Test
    void replayingASpentRefreshTokenEndsTheSession() throws Exception {
        String[] tokens = signIn();

        MvcResult first = mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(tokens[1])))
                .andExpect(status().isOk())
                .andReturn();
        String rotated = JsonPath.read(first.getResponse().getContentAsString(), "$.refreshToken");

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(tokens[1])))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(rotated)))
                .andExpect(status().isBadRequest());
    }

}
