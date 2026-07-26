package com.sewasathi.service;

import com.sewasathi.dto.request.ForgotPasswordRequest;
import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.ResetPasswordRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.EmailVerificationToken;
import com.sewasathi.entity.OtpPurpose;
import com.sewasathi.entity.PasswordResetToken;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.AccountLockedException;
import com.sewasathi.exception.DuplicateEmailException;
import com.sewasathi.exception.EmailNotVerifiedException;
import com.sewasathi.exception.InvalidCredentialsException;
import com.sewasathi.exception.InvalidTokenException;
import com.sewasathi.exception.SuspendedAccountException;
import com.sewasathi.repository.EmailVerificationTokenRepository;
import com.sewasathi.repository.PasswordResetTokenRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import com.sewasathi.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkerProfileRepository workerProfileRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private EmailService emailService;

    @Mock
    private OtpService otpService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /** A stable, already-recognised device unless a test says otherwise. */
    private static final DeviceContext DEVICE =
            new DeviceContext("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", "203.0.113.7");

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, workerProfileRepository, passwordResetTokenRepository,
                emailVerificationTokenRepository, passwordEncoder, jwtService, emailService, otpService
        );
        ReflectionTestUtils.setField(authService, "frontendUrl", "http://localhost:5174");
        lenient().when(jwtService.generateToken(anyString())).thenReturn("fake-jwt-token");
        lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            if (user.getId() == null) {
                user.setId(1L);
            }
            return user;
        });
    }

    private User approvedCustomer(String password) {
        return User.builder()
                .id(1L)
                .email("customer@example.com")
                .passwordHash(passwordEncoder.encode(password))
                .fullName("Test Customer")
                .phone("9800000000")
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .suspended(false)
                .emailVerified(true)
                .failedLoginAttempts(0)
                .build();
    }

    @Test
    void registerCustomer_hashesPasswordAndDoesNotStorePlaintext() {
        RegisterCustomerRequest request = new RegisterCustomerRequest();
        request.setFullName("Test Customer");
        request.setEmail("customer@example.com");
        request.setPhone("9800000000");
        request.setPassword("plaintext123");
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);

        authService.registerCustomer(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getPasswordHash()).isNotEqualTo("plaintext123");
        assertThat(passwordEncoder.matches("plaintext123", saved.getPasswordHash())).isTrue();
        assertThat(saved.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(saved.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(saved.isEmailVerified()).isFalse();
    }

    @Test
    void registerCustomer_sendsVerificationEmail() {
        RegisterCustomerRequest request = new RegisterCustomerRequest();
        request.setFullName("Test Customer");
        request.setEmail("customer@example.com");
        request.setPhone("9800000000");
        request.setPassword("plaintext123");
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);

        authService.registerCustomer(request);

        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));

        // Assert on the rendered model, not just that "an email happened": the verification
        // link is what actually activates the account, and Phase 2 makes login depend on it.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(
                org.mockito.ArgumentMatchers.eq("customer@example.com"),
                anyString(),
                org.mockito.ArgumentMatchers.eq("email/verification"),
                model.capture());
        assertThat(model.getValue().get("actionUrl").toString()).contains("/verify-email?token=");
    }

    @Test
    void registerWorker_defaultsToPendingApproval() {
        RegisterWorkerRequest request = new RegisterWorkerRequest();
        request.setFullName("Test Worker");
        request.setEmail("worker@example.com");
        request.setPhone("9800000001");
        request.setPassword("plaintext123");
        when(userRepository.existsByEmail("worker@example.com")).thenReturn(false);

        authService.registerWorker(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(Role.WORKER);
        assertThat(saved.getStatus()).isEqualTo(ApprovalStatus.PENDING);
    }

    @Test
    void registerCustomer_duplicateEmail_isRejected() {
        RegisterCustomerRequest request = new RegisterCustomerRequest();
        request.setFullName("Test Customer");
        request.setEmail("dupe@example.com");
        request.setPhone("9800000000");
        request.setPassword("plaintext123");
        when(userRepository.existsByEmail("dupe@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.registerCustomer(request))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void login_wrongPassword_isRejected() {
        User existing = approvedCustomer("correctPassword");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("wrongPassword");

        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThat(existing.getFailedLoginAttempts()).isEqualTo(1);
    }

    @Test
    void login_correctPassword_succeeds() {
        User existing = approvedCustomer("correctPassword");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        AuthResponse response = authService.login(request, DEVICE);

        assertThat(response.getToken()).isEqualTo("fake-jwt-token");
        assertThat(response.getUser().getEmail()).isEqualTo("customer@example.com");
    }

    @Test
    void login_suspendedAccount_isRejected() {
        User existing = approvedCustomer("correctPassword");
        existing.setSuspended(true);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(SuspendedAccountException.class);
    }

    @Test
    void login_unknownEmail_isRejected() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setEmail("nobody@example.com");
        request.setPassword("whatever123");

        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_fifthConsecutiveFailure_locksAccount() {
        User existing = approvedCustomer("correctPassword");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("wrongPassword");

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> authService.login(request, DEVICE)).isInstanceOf(InvalidCredentialsException.class);
        }

        assertThat(existing.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(existing.getLockedUntil()).isAfter(LocalDateTime.now());
    }

    @Test
    void login_whileLocked_isRejectedEvenWithCorrectPassword() {
        User existing = approvedCustomer("correctPassword");
        existing.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(AccountLockedException.class);
    }

    @Test
    void forgotPassword_existingEmail_createsTokenAndSendsEmail() {
        User existing = approvedCustomer("correctPassword");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("customer@example.com");
        authService.forgotPassword(request);

        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(
                org.mockito.ArgumentMatchers.eq("customer@example.com"),
                anyString(),
                org.mockito.ArgumentMatchers.eq("email/password-reset"),
                model.capture());
        assertThat(model.getValue().get("actionUrl").toString()).contains("/reset-password?token=");
    }

    @Test
    void forgotPassword_unknownEmail_doesNotThrowOrLeakExistence() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("nobody@example.com");
        authService.forgotPassword(request);

        verify(passwordResetTokenRepository, never()).save(any());
        verify(emailService, never()).sendTemplate(anyString(), anyString(), anyString(), org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void resetPassword_validToken_updatesPasswordHash() {
        User existing = approvedCustomer("oldPassword");
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L).user(existing).token("valid-token")
                .expiresAt(LocalDateTime.now().plusMinutes(30)).used(false)
                .build();
        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("brandNewPassword123");
        authService.resetPassword(request);

        assertThat(passwordEncoder.matches("brandNewPassword123", existing.getPasswordHash())).isTrue();
        assertThat(token.isUsed()).isTrue();
    }

    @Test
    void resetPassword_expiredToken_isRejected() {
        User existing = approvedCustomer("oldPassword");
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L).user(existing).token("expired-token")
                .expiresAt(LocalDateTime.now().minusMinutes(1)).used(false)
                .build();
        when(passwordResetTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("expired-token");
        request.setNewPassword("brandNewPassword123");

        assertThatThrownBy(() -> authService.resetPassword(request))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void resetPassword_alreadyUsedToken_isRejected() {
        User existing = approvedCustomer("oldPassword");
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L).user(existing).token("used-token")
                .expiresAt(LocalDateTime.now().plusMinutes(30)).used(true)
                .build();
        when(passwordResetTokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("used-token");
        request.setNewPassword("brandNewPassword123");

        assertThatThrownBy(() -> authService.resetPassword(request))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void verifyEmail_validToken_marksUserVerified() {
        User existing = approvedCustomer("password");
        existing.setEmailVerified(false);
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(1L).user(existing).token("verify-token")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        when(emailVerificationTokenRepository.findByToken("verify-token")).thenReturn(Optional.of(token));

        authService.verifyEmail("verify-token");

        assertThat(existing.isEmailVerified()).isTrue();
        verify(emailVerificationTokenRepository).delete(token);
    }

    @Test
    void verifyEmail_expiredToken_isRejected() {
        User existing = approvedCustomer("password");
        existing.setEmailVerified(false);
        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(1L).user(existing).token("expired-verify-token")
                .expiresAt(LocalDateTime.now().minusHours(1))
                .build();
        when(emailVerificationTokenRepository.findByToken("expired-verify-token")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.verifyEmail("expired-verify-token"))
                .isInstanceOf(InvalidTokenException.class);
        assertThat(existing.isEmailVerified()).isFalse();
    }

    // --- Email verification is now enforced, not decorative ---

    @Test
    void register_doesNotIssueAToken_untilTheEmailIsVerified() {
        RegisterCustomerRequest request = new RegisterCustomerRequest();
        request.setFullName("Test Customer");
        request.setEmail("customer@example.com");
        request.setPhone("9800000000");
        request.setPassword("plaintext123");
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);

        AuthResponse response = authService.registerCustomer(request);

        // Handing out a working token here would make the verification step pointless.
        assertThat(response.getToken()).isNull();
        assertThat(response.getRequiresVerification()).isTrue();
        assertThat(response.getUser().getEmail()).isEqualTo("customer@example.com");
    }

    @Test
    void login_unverifiedEmail_isRejectedWithItsOwnError() {
        User existing = approvedCustomer("correctPassword");
        existing.setEmailVerified(false);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        // Distinct from InvalidCredentialsException so the UI can offer "resend link"
        // rather than telling the user their password is wrong.
        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(EmailNotVerifiedException.class);
    }

    @Test
    void login_checksPasswordBeforeVerificationState() {
        User existing = approvedCustomer("correctPassword");
        existing.setEmailVerified(false);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("wrongPassword");

        // A wrong password must not reveal whether the account is verified, otherwise the
        // error becomes an oracle for which addresses have registered accounts.
        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    // --- Second factor ---

    @Test
    void login_withTwoFactorOn_returnsAChallengeInsteadOfAToken() {
        User existing = approvedCustomer("correctPassword");
        existing.setTwoFactorEnabled(true);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));
        when(otpService.issue(existing, OtpPurpose.LOGIN_2FA, DEVICE)).thenReturn("challenge-abc");

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        AuthResponse response = authService.login(request, DEVICE);

        assertThat(response.getToken()).isNull();
        assertThat(response.getChallengeRequired()).isTrue();
        assertThat(response.getChallengeToken()).isEqualTo("challenge-abc");
    }

    @Test
    void login_fromAnUnrecognisedDevice_returnsAChallenge() {
        User existing = approvedCustomer("correctPassword");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));
        when(otpService.isNewDevice(existing, DEVICE)).thenReturn(true);
        when(otpService.issue(existing, OtpPurpose.NEW_DEVICE, DEVICE)).thenReturn("challenge-xyz");

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        AuthResponse response = authService.login(request, DEVICE);

        assertThat(response.getChallengeRequired()).isTrue();
        assertThat(response.getChallengeToken()).isEqualTo("challenge-xyz");
        verify(otpService, never()).trustDevice(any(), any());
    }

    @Test
    void login_fromAKnownDevice_issuesATokenAndTouchesTheDevice() {
        User existing = approvedCustomer("correctPassword");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));
        when(otpService.isNewDevice(existing, DEVICE)).thenReturn(false);

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        AuthResponse response = authService.login(request, DEVICE);

        assertThat(response.getToken()).isEqualTo("fake-jwt-token");
        verify(otpService).trustDevice(existing, DEVICE);
    }

    @Test
    void verifyOtp_validCode_issuesAToken() {
        User existing = approvedCustomer("correctPassword");
        when(otpService.verify("challenge-abc", "123456")).thenReturn(existing);

        AuthResponse response = authService.verifyOtp("challenge-abc", "123456");

        assertThat(response.getToken()).isEqualTo("fake-jwt-token");
        assertThat(response.getUser().getEmail()).isEqualTo("customer@example.com");
    }

    @Test
    void verifyOtp_accountSuspendedSinceTheChallenge_isRejected() {
        User existing = approvedCustomer("correctPassword");
        existing.setSuspended(true);
        when(otpService.verify("challenge-abc", "123456")).thenReturn(existing);

        // Suspension can land between issuing the challenge and the code coming back, so
        // account state is re-checked rather than assumed from the first half of the login.
        assertThatThrownBy(() -> authService.verifyOtp("challenge-abc", "123456"))
                .isInstanceOf(SuspendedAccountException.class);
    }

    @Test
    void resendVerification_unknownOrVerifiedAddress_staysSilent() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());
        User verified = approvedCustomer("password");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(verified));

        authService.resendVerification("nobody@example.com");
        authService.resendVerification("customer@example.com");

        // Neither case sends mail, and neither throws - the endpoint is public, so any
        // difference in behaviour would let a caller enumerate registered addresses.
        verify(emailService, never()).sendTemplate(anyString(), anyString(), anyString(),
                org.mockito.ArgumentMatchers.anyMap());
    }
}
