package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import com.sewasathi.repository.PendingRegistrationRepository;
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
 * The signup challenge against the real transaction manager, which the Mockito-based
 * {@link com.sewasathi.service.RegistrationOtpServiceTest} cannot reach.
 *
 * <p>It exists for one reason above all: every rejection in the OTP path throws, and rejecting
 * a code is also when the attempt counter is written. With default rollback rules the two
 * cancel out - the counter resets on every wrong guess and the cap is never reached, leaving
 * the code open to unlimited guessing. Mocked repositories report the increment happily
 * either way, so only a test like this one can tell the difference.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SignupOtpIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PendingRegistrationRepository pendingRegistrationRepository;

    @MockitoSpyBean
    private EmailService emailService;

    private String email;
    private String challengeToken;

    @BeforeEach
    void submitASignup() throws Exception {
        email = "signup-otp-" + System.nanoTime() + "@example.com";
        MvcResult result = mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content("""
                                {"fullName":"Otp Itest","email":"%s","phone":"9800000044","password":"OtpItest1!"}
                                """.formatted(email)))
                .andExpect(status().isAccepted())
                .andReturn();
        challengeToken = JsonPath.read(result.getResponse().getContentAsString(), "$.challengeToken");
    }

    private void submitWrongCode(String code) throws Exception {
        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"%s"}
                                """.formatted(challengeToken, code)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void wrongCodes_actuallyAccumulate() throws Exception {
        submitWrongCode("000000");
        // The second rejection must know about the first. If the counter rolled back with
        // the exception that carried it, this would report four again and go on doing so
        // for as many guesses as anyone cared to make.
        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"111111"}
                                """.formatted(challengeToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("3 attempt")));

        assertThat(pendingRegistrationRepository.findByChallengeToken(challengeToken))
                .get()
                .extracting(p -> p.getAttempts())
                .isEqualTo(2);
    }

    @Test
    void fifthWrongCode_burnsTheChallengeForGood() throws Exception {
        for (int i = 0; i < 5; i++) {
            submitWrongCode("00000" + i);
        }

        // Destroyed, not merely refused: the row has to be gone, or the deletion would have
        // rolled back with the exception that reported it.
        assertThat(pendingRegistrationRepository.findByChallengeToken(challengeToken)).isEmpty();
        assertThat(userRepository.findByEmail(email)).isEmpty();

        submitWrongCode("123456");
    }

    @Test
    void theRightCode_createsTheAccountAndSpendsTheChallenge() throws Exception {
        String code = SignupFlow.codeSentTo(emailService, email);

        assertThat(userRepository.findByEmail(email)).isEmpty();

        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"%s"}
                                """.formatted(challengeToken, code)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value(email));

        assertThat(userRepository.findByEmail(email)).isPresent();
        assertThat(pendingRegistrationRepository.findByChallengeToken(challengeToken)).isEmpty();

        // Replaying the same code must not produce a second account.
        submitWrongCode(code);
    }

    @Test
    void resubmittingTheSameAddress_replacesTheEarlierAttempt() throws Exception {
        // Someone who mistyped, gave up, and came back must not be blocked by the unique
        // index on a row they can no longer complete.
        MvcResult again = mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content("""
                                {"fullName":"Otp Itest","email":"%s","phone":"9800000044","password":"OtpItest1!"}
                                """.formatted(email)))
                .andExpect(status().isAccepted())
                .andReturn();

        String newToken = JsonPath.read(again.getResponse().getContentAsString(), "$.challengeToken");
        assertThat(newToken).isNotEqualTo(challengeToken);
        assertThat(pendingRegistrationRepository.findByChallengeToken(challengeToken)).isEmpty();
    }

    @Test
    void resend_insideTheCooldown_isRefusedWithoutDisturbingTheChallenge() throws Exception {
        mockMvc.perform(post("/api/auth/register/resend")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s"}
                                """.formatted(challengeToken)))
                .andExpect(status().isBadRequest());

        // The refusal must not have taken the challenge with it - the user still has a code
        // in their inbox and a screen waiting for it.
        assertThat(pendingRegistrationRepository.findByChallengeToken(challengeToken)).isPresent();
    }
}
