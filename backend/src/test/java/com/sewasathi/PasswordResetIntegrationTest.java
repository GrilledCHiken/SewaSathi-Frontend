package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import com.sewasathi.entity.User;
import com.sewasathi.repository.PasswordResetChallengeRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The password reset end to end, against the real transaction manager. Covers two things
 * {@link com.sewasathi.service.PasswordResetServiceTest} cannot see: the rollback trap, where
 * a rejection throws away the attempt increment it just wrote and leaves the code open to
 * unlimited guessing, and whether the new password actually signs anyone in.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetIntegrationTest {

    private static final String OLD_PASSWORD = "OldPass1!";
    private static final String NEW_PASSWORD = "BrandNew1!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetChallengeRepository challengeRepository;

    @MockitoSpyBean
    private EmailService emailService;

    private String email;

    @BeforeEach
    void createAnAccount() throws Exception {
        email = "reset-" + System.nanoTime() + "@example.com";
        SignupFlow.registerCustomer(
                mockMvc, emailService, "Reset Person", email, "9800000055", OLD_PASSWORD);
    }

    private String startReset() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s"}
                                """.formatted(email)))
                // 202, not 200: nothing about the account has changed yet.
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.challengeToken");
    }

    private void submitCode(String challengeToken, String code, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/auth/password/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"%s"}
                                """.formatted(challengeToken, code)))
                .andExpect(status().is(expectedStatus));
    }

    private void setNewPassword(String challengeToken) throws Exception {
        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","newPassword":"%s"}
                                """.formatted(challengeToken, NEW_PASSWORD)))
                .andExpect(status().isNoContent());
    }

    private MvcResult login(String password, int expectedStatus) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }

    /** Walks the whole flow and leaves the account on {@link #NEW_PASSWORD}. */
    private String resetToTheNewPassword() throws Exception {
        String challengeToken = startReset();
        submitCode(challengeToken, SignupFlow.codeSentTo(emailService, email), 200);
        setNewPassword(challengeToken);
        return challengeToken;
    }

    @Test
    void theWholeFlow_leavesTheAccountOnTheNewPassword() throws Exception {
        String challengeToken = resetToTheNewPassword();

        login(NEW_PASSWORD, 200);
        // The old one has to stop working, or the reset would only have added a password
        // rather than replaced one.
        login(OLD_PASSWORD, 401);
        assertThat(challengeRepository.findByChallengeToken(challengeToken)).isEmpty();
    }

    @Test
    void wrongCodes_actuallyAccumulate() throws Exception {
        String challengeToken = startReset();

        submitCode(challengeToken, "000000", 400);
        // The second rejection must know about the first. If the counter rolled back with the
        // exception that carried it, this would report four again indefinitely.
        mockMvc.perform(post("/api/auth/password/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"111111"}
                                """.formatted(challengeToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("3 attempt")));

        assertThat(challengeRepository.findByChallengeToken(challengeToken))
                .get()
                .extracting(c -> c.getAttempts())
                .isEqualTo(2);
    }

    @Test
    void fifthWrongCode_burnsTheChallengeForGood() throws Exception {
        String challengeToken = startReset();

        for (int i = 0; i < 5; i++) {
            submitCode(challengeToken, "00000" + i, 400);
        }

        // Destroyed, not merely refused: the row has to be gone, or the deletion would have
        // rolled back with the exception that reported it.
        assertThat(challengeRepository.findByChallengeToken(challengeToken)).isEmpty();
        // And the password it was guarding is untouched.
        login(OLD_PASSWORD, 200);
    }

    @Test
    void theNewPassword_isRefusedWithoutTheCodeStep() throws Exception {
        String challengeToken = startReset();

        // Holding the token proves the browser started the reset, not that anyone read the
        // mailbox - which is the entire point of the code.
        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","newPassword":"%s"}
                                """.formatted(challengeToken, NEW_PASSWORD)))
                .andExpect(status().isBadRequest());

        login(OLD_PASSWORD, 200);
    }

    @Test
    void unknownAddress_isAnsweredPlainlyAndSendsNothing() throws Exception {
        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType("application/json")
                        .content("""
                                {"email":"nobody-here@example.com"}
                                """))
                .andExpect(status().isNotFound());

        assertThat(challengeRepository.findByEmail("nobody-here@example.com")).isEmpty();
    }

    @Test
    void secondRequestInsideTheCooldown_isRefusedWithoutDisturbingTheFirst() throws Exception {
        String challengeToken = startReset();

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s"}
                                """.formatted(email)))
                .andExpect(status().isBadRequest());

        // The refusal must not have taken the challenge with it - the user still has a code in
        // their inbox and a screen waiting for it.
        assertThat(challengeRepository.findByChallengeToken(challengeToken)).isPresent();
    }

    @Test
    void aLockedOutAccount_canSignInImmediatelyAfterResetting() throws Exception {
        for (int i = 0; i < 5; i++) {
            login("WrongPass1!", 401);
        }
        login(OLD_PASSWORD, 423);

        resetToTheNewPassword();

        // The likeliest reason anyone reaches this flow at all. Leaving the lockout in place
        // would mean the password they just chose does not work either.
        login(NEW_PASSWORD, 200);
    }

    @Test
    void aGoogleOnlyAccount_gainsAPasswordItCanSignInWith() throws Exception {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPasswordHash(null);
        userRepository.save(user);
        login(OLD_PASSWORD, 401);

        resetToTheNewPassword();

        // The only way out for someone who does not remember that they signed up with Google.
        login(NEW_PASSWORD, 200);
    }

    @Test
    void everySessionOpenBeforeTheReset_stopsWorking() throws Exception {
        MvcResult signedIn = login(OLD_PASSWORD, 200);
        String refreshToken =
                JsonPath.read(signedIn.getResponse().getContentAsString(), "$.refreshToken");

        resetToTheNewPassword();

        // A reset is how someone reacts to thinking their account is compromised, so leaving
        // the intruder's tokens alive would defeat the point of it.
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(refreshToken)))
                .andExpect(status().is4xxClientError());
    }
}
