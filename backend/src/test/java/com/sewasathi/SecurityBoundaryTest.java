package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityBoundaryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    /** Signing up now needs the emailed code, which SignupFlow reads back off this spy. */
    @MockitoSpyBean
    private EmailService emailService;

    @Test
    void tasksMine_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/tasks/mine"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminOverview_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workerTasks_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/worker/tasks/open"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workerDecline_withoutToken_isUnauthorized() throws Exception {
        // Answering a direct hire request is the worker's call alone, so the endpoint sits
        // under the WORKER-only /api/worker/** tree rather than beside the customer's assign.
        mockMvc.perform(patch("/api/worker/tasks/1/decline"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authRegisterCustomer_isPubliclyReachable() throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_createsNothingUntilTheEmailedCodeComesBack() throws Exception {
        String email = "boundary-" + System.currentTimeMillis() + "@example.com";
        String registerBody = """
                {"fullName":"Boundary User","email":"%s","phone":"9800000098","password":"BoundaryPass1!"}
                """.formatted(email);

        // Submitting the form hands back a challenge, not an account: 202, no user in the
        // body, and nothing in the users table yet.
        MvcResult submitted = mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content(registerBody))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.challengeToken").isNotEmpty())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andReturn();
        assertThat(userRepository.findByEmail(email)).isEmpty();

        // A wrong code creates nothing either.
        String challengeToken =
                JsonPath.read(submitted.getResponse().getContentAsString(), "$.challengeToken");
        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"000000"}
                                """.formatted(challengeToken)))
                .andExpect(status().isBadRequest());
        assertThat(userRepository.findByEmail(email)).isEmpty();

        // The right code does, and still issues no session: the client sends the user to the
        // sign-in page rather than being given a token it never asked for.
        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"%s"}
                                """.formatted(challengeToken, SignupFlow.codeSentTo(emailService, email))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.user.email").value(email));

        // Nothing gates the sign-in that follows - the address has already been proved.
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"BoundaryPass1!"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void authVerifyAndResend_arePubliclyReachable() throws Exception {
        // Both halves of signing up have to be reachable without a token - there is no
        // account to authenticate as until the second one succeeds.
        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/auth/register/resend")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void authenticatedWrongRole_isForbiddenNotUnauthorized() throws Exception {
        String email = "boundary-worker-" + System.currentTimeMillis() + "@example.com";
        SignupFlow.registerWorker(mockMvc, emailService,
                "Boundary Worker", email, "9800000099", "BoundaryPass1!");

        // Registration no longer hands back a token, so obtain one the way a real user would:
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"BoundaryPass1!"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();

        String token = JsonPath.read(loginResult.getResponse().getContentAsString(), "$.token");

        // A WORKER token hitting a CUSTOMER-only endpoint must be 403 (authenticated but not
        // permitted), not 401 (which would wrongly imply the credentials themselves were rejected).
        mockMvc.perform(get("/api/tasks/mine").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
