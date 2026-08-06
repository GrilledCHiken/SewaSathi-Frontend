package com.sewasathi.service;

import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.VerifyRegistrationRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.dto.response.PendingRegistrationResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.PendingRegistration;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.AccountLockedException;
import com.sewasathi.exception.DuplicateEmailException;
import com.sewasathi.exception.InvalidCredentialsException;
import com.sewasathi.exception.OtpException;
import com.sewasathi.exception.SuspendedAccountException;
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

import java.time.LocalDateTime;
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
    private JwtService jwtService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private RegistrationOtpService registrationOtpService;

    @Mock
    private GoogleIdentityService googleIdentityService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /** Stand-in for the challenge the OTP service hands back when a signup is submitted. */
    private static final RegistrationOtpService.Challenge CHALLENGE =
            new RegistrationOtpService.Challenge("challenge-token", "customer@example.com", 600, 60);

    /** Every sign-in records a device label against its refresh token. */
    private static final DeviceContext DEVICE =
            new DeviceContext("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", "203.0.113.7");

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, workerProfileRepository, passwordEncoder, jwtService,
                refreshTokenService, registrationOtpService, googleIdentityService
        );
        lenient().when(jwtService.generateToken(anyString())).thenReturn("fake-jwt-token");
        lenient().when(refreshTokenService.issue(any(User.class), any())).thenReturn("fake-refresh-token");
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
                .failedLoginAttempts(0)
                .build();
    }

    private RegisterCustomerRequest customerRequest() {
        RegisterCustomerRequest request = new RegisterCustomerRequest();
        request.setFullName("Test Customer");
        request.setEmail("customer@example.com");
        request.setPhone("9800000000");
        request.setPassword("plaintext123");
        return request;
    }

    /** The draft AuthService parks when a signup is submitted, as the OTP service would see it. */
    private PendingRegistration submittedDraft(Runnable submit) {
        when(registrationOtpService.issue(any(PendingRegistration.class))).thenReturn(CHALLENGE);
        submit.run();
        ArgumentCaptor<PendingRegistration> captor = ArgumentCaptor.forClass(PendingRegistration.class);
        verify(registrationOtpService).issue(captor.capture());
        return captor.getValue();
    }

    @Test
    void registerCustomer_createsNoAccountUntilTheCodeComesBack() {
        RegisterCustomerRequest request = customerRequest();
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        when(registrationOtpService.issue(any(PendingRegistration.class))).thenReturn(CHALLENGE);

        PendingRegistrationResponse response = authService.registerCustomer(request);

        // Submitting the form must not touch the accounts table - that is the whole point of
        // the change. The account appears only in completeRegistration.
        verify(userRepository, never()).save(any(User.class));
        assertThat(response.getChallengeToken()).isEqualTo("challenge-token");
        assertThat(response.getEmail()).isEqualTo("customer@example.com");
    }

    @Test
    void registerCustomer_hashesPasswordBeforeItIsEvenParked() {
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);

        PendingRegistration draft = submittedDraft(() -> authService.registerCustomer(customerRequest()));

        // A table of unfinished signups is no more entitled to plaintext than the accounts
        // table is, so the hashing happens on the way in rather than at verification time.
        assertThat(draft.getPasswordHash()).isNotEqualTo("plaintext123");
        assertThat(passwordEncoder.matches("plaintext123", draft.getPasswordHash())).isTrue();
        assertThat(draft.getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void completeRegistration_createsTheApprovedCustomer() {
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        PendingRegistration draft = submittedDraft(() -> authService.registerCustomer(customerRequest()));
        when(registrationOtpService.verify("challenge-token", "123456")).thenReturn(draft);

        authService.completeRegistration(verification("challenge-token", "123456"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(passwordEncoder.matches("plaintext123", saved.getPasswordHash())).isTrue();
        assertThat(saved.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(saved.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        // The challenge is spent, so the same code cannot create a second account.
        verify(registrationOtpService).consume(draft);
    }

    @Test
    void completeRegistration_worker_defaultsToPendingApproval() {
        RegisterWorkerRequest request = new RegisterWorkerRequest();
        request.setFullName("Test Worker");
        request.setEmail("worker@example.com");
        request.setPhone("9800000001");
        request.setPassword("plaintext123");
        when(userRepository.existsByEmail("worker@example.com")).thenReturn(false);

        PendingRegistration draft = submittedDraft(() -> authService.registerWorker(request));
        when(registrationOtpService.verify("challenge-token", "123456")).thenReturn(draft);

        authService.completeRegistration(verification("challenge-token", "123456"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(Role.WORKER);
        assertThat(saved.getStatus()).isEqualTo(ApprovalStatus.PENDING);
        verify(workerProfileRepository).save(any(WorkerProfile.class));
    }

    @Test
    void completeRegistration_rejectedCode_createsNothing() {
        when(registrationOtpService.verify("challenge-token", "000000"))
                .thenThrow(OtpException.invalid(4));

        assertThatThrownBy(() -> authService.completeRegistration(verification("challenge-token", "000000")))
                .isInstanceOf(OtpException.class);

        verify(userRepository, never()).save(any(User.class));
        verify(workerProfileRepository, never()).save(any(WorkerProfile.class));
    }

    @Test
    void completeRegistration_addressTakenSinceSubmitting_isRejected() {
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        PendingRegistration draft = submittedDraft(() -> authService.registerCustomer(customerRequest()));
        when(registrationOtpService.verify("challenge-token", "123456")).thenReturn(draft);
        // Minutes can pass between submitting the form and typing the code, and the address
        // is not reserved in the meantime.
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.completeRegistration(verification("challenge-token", "123456")))
                .isInstanceOf(DuplicateEmailException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    private VerifyRegistrationRequest verification(String challengeToken, String code) {
        VerifyRegistrationRequest request = new VerifyRegistrationRequest();
        request.setChallengeToken(challengeToken);
        request.setCode(code);
        return request;
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
    void completeRegistration_returnsTheAccountWithoutATokenAndLeavesItImmediatelyUsable() {
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        PendingRegistration draft = submittedDraft(() -> authService.registerCustomer(customerRequest()));
        when(registrationOtpService.verify("challenge-token", "123456")).thenReturn(draft);

        AuthResponse registered = authService.completeRegistration(verification("challenge-token", "123456"));

        // No token: the client sends the user to the sign-in page rather than being handed
        // a session it never asked for.
        assertThat(registered.getToken()).isNull();
        assertThat(registered.getRefreshToken()).isNull();
        assertThat(registered.getUser().getEmail()).isEqualTo("customer@example.com");

        // Verifying the address is the only thing between signing up and signing in: the
        // account it produces needs no approval step and is usable at once.
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        when(userRepository.findByEmail("customer@example.com"))
                .thenReturn(Optional.of(captor.getValue()));

        LoginRequest signIn = new LoginRequest();
        signIn.setEmail("customer@example.com");
        signIn.setPassword("plaintext123");

        AuthResponse session = authService.login(signIn, DEVICE);
        assertThat(session.getToken()).isEqualTo("fake-jwt-token");
        assertThat(session.getRefreshToken()).isEqualTo("fake-refresh-token");
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
        existing.setSuspensionReason("Repeated no-shows on confirmed bookings.");
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        // The admin's reason travels all the way to the login screen, which renders this
        // message verbatim - it is the only explanation the person ever sees in the app.
        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(SuspendedAccountException.class)
                .hasMessageContaining("Repeated no-shows on confirmed bookings.");
    }

    @Test
    void login_suspendedAccount_withNoReasonRecorded_fallsBackToTheGenericNotice() {
        User existing = approvedCustomer("correctPassword");
        existing.setSuspended(true);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(SuspendedAccountException.class)
                .hasMessageContaining("Contact support for details");
    }

    @Test
    void login_checksPasswordBeforeAccountState() {
        User existing = approvedCustomer("correctPassword");
        existing.setSuspended(true);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("wrongPassword");

        // A wrong password must not reveal whether the account is suspended, otherwise the
        // error becomes an oracle for which addresses have registered accounts.
        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(InvalidCredentialsException.class);
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
    void login_afterASuccessfulAttempt_clearsTheFailureCounter() {
        User existing = approvedCustomer("correctPassword");
        existing.setFailedLoginAttempts(3);
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");
        authService.login(request, DEVICE);

        // Otherwise three old typos plus two fresh ones would lock an account that has just
        // proved it knows the password.
        assertThat(existing.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(existing.getLockedUntil()).isNull();
    }
}
