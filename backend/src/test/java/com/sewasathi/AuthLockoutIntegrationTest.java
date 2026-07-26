package com.sewasathi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
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

    @Test
    void fifthFailedAttempt_locksAccountEvenOnSubsequentCorrectPassword() throws Exception {
        String email = "lockout-itest-" + System.currentTimeMillis() + "@example.com";
        String registerBody = """
                {"fullName":"Lockout Itest","email":"%s","phone":"9800000030","password":"CorrectPass1!"}
                """.formatted(email);
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content(registerBody))
                .andExpect(status().isCreated());

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
