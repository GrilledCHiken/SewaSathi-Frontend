package com.sewasathi;

import com.sewasathi.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real transaction manager end-to-end (unlike the Mockito-based AuthServiceTest),
 * because a failed-login counter that gets wiped out by transaction rollback is exactly the kind
 * of bug pure unit tests with mocked repositories cannot catch.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthLockoutIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    /** Signing up now needs the emailed code, which SignupFlow reads back off this spy. */
    @MockitoSpyBean
    private EmailService emailService;

    @Test
    void fifthFailedAttempt_locksAccountEvenOnSubsequentCorrectPassword() throws Exception {
        String email = "lockout-itest-" + System.currentTimeMillis() + "@example.com";
        SignupFlow.registerCustomer(mockMvc, emailService,
                "Lockout Itest", email, "9800000030", "CorrectPass1!");

        String wrongLoginBody = """
                {"email":"%s","password":"wrongPassword"}
                """.formatted(email);
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType("application/json")
                            .content(wrongLoginBody))
                    .andExpect(status().isUnauthorized());
        }

        String correctLoginBody = """
                {"email":"%s","password":"CorrectPass1!"}
                """.formatted(email);
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(correctLoginBody))
                .andExpect(status().isLocked());
    }
}
