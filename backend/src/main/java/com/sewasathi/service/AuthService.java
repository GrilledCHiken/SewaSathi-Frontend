package com.sewasathi.service;

import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.AccountLockedException;
import com.sewasathi.exception.DuplicateEmailException;
import com.sewasathi.exception.InvalidCredentialsException;
import com.sewasathi.exception.SuspendedAccountException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import com.sewasathi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public AuthResponse registerCustomer(RegisterCustomerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        ensureEmailAvailable(email);

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .build();

        user = userRepository.save(user);
        // The account is usable straight away; the client sends the user to the sign-in page
        // to enter the password once rather than being handed a token here.
        return AuthResponse.registered(UserResponse.from(user));
    }

    @Transactional
    public AuthResponse registerWorker(RegisterWorkerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        ensureEmailAvailable(email);

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .role(Role.WORKER)
                // Workers can sign in immediately, but stay PENDING until an admin approves
                // them, which is what gates accepting tasks.
                .status(ApprovalStatus.PENDING)
                .build();
        user = userRepository.save(user);

        WorkerProfile profile = WorkerProfile.builder()
                .user(user)
                .skills(request.getSkills())
                .hourlyRate(request.getHourlyRate())
                .location(request.getLocation())
                .bio(request.getBio())
                .build();
        workerProfileRepository.save(profile);

        return AuthResponse.registered(UserResponse.from(user));
    }

    /**
     * Signs a user in.
     *
     * <p>The order of the checks matters: lockout and password come first, so an account's
     * suspension state cannot be probed without the correct password.
     */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AuthResponse login(LoginRequest request, DeviceContext device) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            long minutesLeft = java.time.Duration.between(LocalDateTime.now(), user.getLockedUntil()).toMinutes() + 1;
            throw new AccountLockedException(
                    "Too many failed attempts. Try again in " + minutesLeft + " minute(s)."
            );
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            registerFailedAttempt(user);
            throw new InvalidCredentialsException();
        }

        if (user.isSuspended()) {
            throw new SuspendedAccountException();
        }

        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        return buildAuthResponse(user, device);
    }

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
        return UserResponse.from(user);
    }

    private void registerFailedAttempt(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
            user.setFailedLoginAttempts(0);
        }
        userRepository.save(user);
    }

    private void ensureEmailAvailable(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }
    }

    /**
     * Issues the access/refresh pair that completes a sign-in.
     *
     * <p>The access token is deliberately short-lived; the refresh token beside it is what
     * keeps the user signed in, and unlike the JWT it can be revoked (requirement #2).
     */
    private AuthResponse buildAuthResponse(User user, DeviceContext device) {
        String token = jwtService.generateToken(user.getEmail());
        String refreshToken = refreshTokenService.issue(user, device);
        return AuthResponse.authenticated(token, refreshToken, UserResponse.from(user));
    }

    /**
     * Exchanges a refresh token for a fresh pair. The old token is spent in the process, so
     * a captured one stops working as soon as the real client refreshes again.
     */
    @Transactional
    public AuthResponse refresh(String refreshToken, DeviceContext device) {
        RefreshTokenService.RotationResult rotated = refreshTokenService.rotate(refreshToken, device);
        User user = rotated.user();

        // State can have changed since the chain started - a suspension in particular must
        // end the session rather than be renewed straight past.
        if (user.isSuspended()) {
            refreshTokenService.revokeAllForUser(user.getId());
            throw new SuspendedAccountException();
        }

        return AuthResponse.refreshed(
                jwtService.generateToken(user.getEmail()),
                rotated.refreshToken(),
                UserResponse.from(user));
    }

    /** Ends the session behind one refresh token. Other devices stay signed in. */
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revoke(refreshToken);
        }
    }

    /** Ends every session for an account. */
    @Transactional
    public void logoutEverywhere(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
        refreshTokenService.revokeAllForUser(user.getId());
    }
}
