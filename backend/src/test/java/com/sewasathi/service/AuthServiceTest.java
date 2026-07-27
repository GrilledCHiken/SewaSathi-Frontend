package com.sewasathi.service;

import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.AccountLockedException;
import com.sewasathi.exception.DuplicateEmailException;
import com.sewasathi.exception.InvalidCredentialsException;
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

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /** Every sign-in records a device label against its refresh token. */
    private static final DeviceContext DEVICE =
            new DeviceContext("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", "203.0.113.7");

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, workerProfileRepository, passwordEncoder, jwtService,
                refreshTokenService
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
    void register_returnsTheAccountWithoutATokenAndLeavesItImmediatelyUsable() {
        RegisterCustomerRequest registration = new RegisterCustomerRequest();
        registration.setFullName("Test Customer");
        registration.setEmail("customer@example.com");
        registration.setPhone("9800000000");
        registration.setPassword("plaintext123");
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);

        AuthResponse registered = authService.registerCustomer(registration);

        // No token: the client sends the user to the sign-in page rather than being handed
        // a session it never asked for.
        assertThat(registered.getToken()).isNull();
        assertThat(registered.getRefreshToken()).isNull();
        assertThat(registered.getUser().getEmail()).isEqualTo("customer@example.com");

        // Nothing stands between registering and signing in - no confirmation step, no
        // second factor. This is the behaviour the whole change exists to restore.
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
        when(userRepository.findByEmail("customer@example.com")).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest();
        request.setEmail("customer@example.com");
        request.setPassword("correctPassword");

        assertThatThrownBy(() -> authService.login(request, DEVICE))
                .isInstanceOf(SuspendedAccountException.class);
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
