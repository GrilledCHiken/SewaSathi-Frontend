package com.sewasathi;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.AuthProvider;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.GoogleAuthException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.service.GoogleIdentity;
import com.sewasathi.service.GoogleIdentityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Sign in with Google" over real HTTP against the real transaction manager. The token check
 * itself is covered by {@link com.sewasathi.service.GoogleIdentityServiceTest}; here the
 * verifier is mocked so the tests can concentrate on what the endpoint does with an identity
 * once it trusts it - which account it finds, what it creates, and what it refuses.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GoogleSignInIntegrationTest {

    private static final String CREDENTIAL = "a-google-id-token";
    private static final String SUBJECT = "108134655321987654321";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private GoogleIdentityService googleIdentityService;

    private String email;

    @BeforeEach
    void identify() {
        email = "google-" + System.nanoTime() + "@example.com";
        when(googleIdentityService.verify(anyString())).thenReturn(new GoogleIdentity(
                SUBJECT, email, "Google Person", "https://lh3.googleusercontent.com/a/photo"));
    }

    private String body(String phone) {
        return phone == null
                ? """
                {"credential":"%s"}
                """.formatted(CREDENTIAL)
                : """
                {"credential":"%s","phone":"%s"}
                """.formatted(CREDENTIAL, phone);
    }

    /** An ordinary password account, as the OTP signup flow would have left it. */
    private User existingPasswordAccount() {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode("ExistingPass1!"))
                .fullName("Existing Person")
                .phone("9800000060")
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .authProvider(AuthProvider.LOCAL)
                .build());
    }

    @Test
    void anUnknownAddress_asksForAPhoneAndCreatesNothing() throws Exception {
        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body(null)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.profileCompletionRequired").value(true))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.fullName").value("Google Person"))
                // No session either: nothing exists to have a session for.
                .andExpect(jsonPath("$.token").doesNotExist());

        assertThat(userRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void aPhoneNumber_createsAnApprovedCustomerWithNoPassword() throws Exception {
        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body("9800000061")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.role").value("CUSTOMER"));

        User created = userRepository.findByEmail(email).orElseThrow();
        assertThat(created.getPasswordHash()).isNull();
        assertThat(created.getPhone()).isEqualTo("9800000061");
        assertThat(created.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(created.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(created.getProviderId()).isEqualTo(SUBJECT);
        assertThat(created.getAvatarUrl()).isEqualTo("https://lh3.googleusercontent.com/a/photo");
    }

    @Test
    void anAccountWithNoPassword_cannotSignInWithOne() throws Exception {
        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body("9800000062")))
                .andExpect(status().isCreated());

        // Told plainly rather than "invalid email or password", which would send the user round
        // in circles - there is no password reset flow to rescue them.
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"AnythingAtAll1!"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Google")));
    }

    @Test
    void anExistingPasswordAccount_isLinkedAndSignedIn() throws Exception {
        User before = existingPasswordAccount();
        String originalHash = before.getPasswordHash();

        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body(null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email));

        User after = userRepository.findByEmail(email).orElseThrow();
        assertThat(after.getProviderId()).isEqualTo(SUBJECT);
        // Linking adds a way in; it must not take the existing one away.
        assertThat(after.getPasswordHash()).isEqualTo(originalHash);
        assertThat(after.getAuthProvider()).isEqualTo(AuthProvider.LOCAL);
        assertThat(after.getPhone()).isEqualTo("9800000060");

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"ExistingPass1!"}
                                """.formatted(email)))
                .andExpect(status().isOk());
    }

    @Test
    void linkingDoesNotOverwriteAnUploadedAvatar() throws Exception {
        User existing = existingPasswordAccount();
        existing.setAvatarUrl("/uploads/chosen-by-the-user.png");
        userRepository.save(existing);

        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body(null)))
                .andExpect(status().isOk());

        assertThat(userRepository.findByEmail(email).orElseThrow().getAvatarUrl())
                .isEqualTo("/uploads/chosen-by-the-user.png");
    }

    @Test
    void aPhoneNumberIsIgnoredWhenTheAccountAlreadyExists() throws Exception {
        existingPasswordAccount();

        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body("9812345678")))
                .andExpect(status().isOk());

        // Signing in must not quietly rewrite the profile of an account that already exists.
        assertThat(userRepository.findByEmail(email).orElseThrow().getPhone()).isEqualTo("9800000060");
    }

    @Test
    void aSuspendedAccount_isRefused() throws Exception {
        User suspended = existingPasswordAccount();
        suspended.setSuspended(true);
        userRepository.save(suspended);

        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body(null)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aRejectedToken_is401() throws Exception {
        when(googleIdentityService.verify(anyString()))
                .thenThrow(new GoogleAuthException("That Google sign-in could not be verified."));

        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body(null)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aMissingCredential_is400() throws Exception {
        mockMvc.perform(post("/api/auth/google").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aMalformedPhone_isRejectedBeforeAnythingIsCreated() throws Exception {
        mockMvc.perform(post("/api/auth/google").contentType("application/json").content(body("12345")))
                .andExpect(status().isBadRequest());

        assertThat(userRepository.findByEmail(email)).isEmpty();
    }
}
