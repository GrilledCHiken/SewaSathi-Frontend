package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import com.sewasathi.service.EmailService;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Drives a signup all the way to an account for tests that need one but are not themselves
 * about signing up.
 *
 * <p>Creating a {@code User} row directly would be shorter, but it would also mean nothing
 * outside the auth tests ever exercises the real path - and the path now has two halves, so a
 * break in the second one would go unnoticed. The verification code never leaves the server,
 * so it is read back off the {@link EmailService} the caller has spied on rather than out of a
 * mailbox.
 *
 * <p>Callers declare the spy themselves:
 * <pre>{@code @MockitoSpyBean private EmailService emailService;}</pre>
 */
final class SignupFlow {

    private SignupFlow() {
    }

    static void registerCustomer(MockMvc mockMvc, EmailService emailSpy,
                                 String fullName, String email, String phone, String password)
            throws Exception {
        register(mockMvc, emailSpy, "customer", fullName, email, phone, password);
    }

    static void registerWorker(MockMvc mockMvc, EmailService emailSpy,
                               String fullName, String email, String phone, String password)
            throws Exception {
        register(mockMvc, emailSpy, "worker", fullName, email, phone, password);
    }

    private static void register(MockMvc mockMvc, EmailService emailSpy, String role,
                                 String fullName, String email, String phone, String password)
            throws Exception {
        MvcResult submitted = mockMvc.perform(post("/api/auth/register/" + role)
                        .contentType("application/json")
                        .content("""
                                {"fullName":"%s","email":"%s","phone":"%s","password":"%s"}
                                """.formatted(fullName, email, phone, password)))
                // 202, not 201: no account exists yet, only a challenge.
                .andExpect(status().isAccepted())
                .andReturn();

        String challengeToken =
                JsonPath.read(submitted.getResponse().getContentAsString(), "$.challengeToken");

        mockMvc.perform(post("/api/auth/register/verify")
                        .contentType("application/json")
                        .content("""
                                {"challengeToken":"%s","code":"%s"}
                                """.formatted(challengeToken, codeSentTo(emailSpy, email))))
                .andExpect(status().isCreated());
    }

    /** Reads the six digits out of the model the OTP email was rendered from. */
    @SuppressWarnings("unchecked")
    static String codeSentTo(EmailService emailSpy, String email) {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(emailSpy, atLeastOnce())
                .sendTemplate(eq(email), anyString(), eq("email/otp"), captor.capture());
        return (String) captor.getValue().get("code");
    }
}
