package com.sewasathi.service;

import com.sewasathi.dto.request.GoogleSignInRequest;
import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.ResendOtpRequest;
import com.sewasathi.dto.request.VerifyRegistrationRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.dto.response.GoogleSignupResponse;
import com.sewasathi.dto.response.PendingRegistrationResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.AuthProvider;
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
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

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
    private final RegistrationOtpService registrationOtpService;
    private final GoogleIdentityService googleIdentityService;

    /**
     * Starts a customer signup. No account is created here: the details are parked as a
     * {@link PendingRegistration} and a six-digit code goes to the address, which
     * {@link #completeRegistration} exchanges for the real {@code users} row. A mistyped
     * address therefore never reaches the accounts table.
     */
    @Transactional
    public PendingRegistrationResponse registerCustomer(RegisterCustomerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        ensureEmailAvailable(email);

        PendingRegistration draft = PendingRegistration.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .role(Role.CUSTOMER)
                .build();

        return PendingRegistrationResponse.from(registrationOtpService.issue(draft));
    }

    /** As {@link #registerCustomer}, carrying the worker-only profile fields through the challenge. */
    @Transactional
    public PendingRegistrationResponse registerWorker(RegisterWorkerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        ensureEmailAvailable(email);

        PendingRegistration draft = PendingRegistration.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .role(Role.WORKER)
                .skills(request.getSkills())
                .hourlyRate(request.getHourlyRate())
                .location(request.getLocation())
                .bio(request.getBio())
                .build();

        return PendingRegistrationResponse.from(registrationOtpService.issue(draft));
    }

    /** Sends another code for a signup already in flight. */
    @Transactional(noRollbackFor = OtpException.class)
    public PendingRegistrationResponse resendRegistrationOtp(ResendOtpRequest request) {
        return PendingRegistrationResponse.from(
                registrationOtpService.resend(request.getChallengeToken()));
    }

    /**
     * Finishes a signup: checks the emailed code and only then creates the account. The
     * availability check runs again rather than being trusted from submit time. {@code
     * noRollbackFor} is repeated from {@link RegistrationOtpService#verify}, which joins this
     * transaction - without it every wrong guess would roll back its own attempt increment.
     */
    @Transactional(noRollbackFor = OtpException.class)
    public AuthResponse completeRegistration(VerifyRegistrationRequest request) {
        PendingRegistration pending =
                registrationOtpService.verify(request.getChallengeToken(), request.getCode());
        ensureEmailAvailable(pending.getEmail());

        User user = User.builder()
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .fullName(pending.getFullName())
                .phone(pending.getPhone())
                .role(pending.getRole())
                // Workers can sign in immediately, but stay PENDING until an admin approves
                // them, which is what gates accepting tasks.
                .status(pending.getRole() == Role.WORKER ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED)
                .build();
        user = userRepository.save(user);

        if (pending.getRole() == Role.WORKER) {
            workerProfileRepository.save(WorkerProfile.builder()
                    .user(user)
                    .skills(pending.getSkills())
                    .hourlyRate(pending.getHourlyRate())
                    .location(pending.getLocation())
                    .bio(pending.getBio())
                    .build());
        }

        registrationOtpService.consume(pending);

        // The account is usable straight away; the client sends the user to the sign-in page
        // rather than being handed a token here.
        return AuthResponse.registered(UserResponse.from(user));
    }

    /**
     * Signs in with a Google ID token, creating the account if this is the first time. Matching
     * is by verified email and an existing account is linked rather than refused, which is safe
     * because {@link GoogleIdentityService} insists on {@code email_verified}. A brand-new
     * account is always a CUSTOMER - becoming a worker needs documents and admin approval.
     */
    @Transactional
    public GoogleSignInOutcome loginWithGoogle(GoogleSignInRequest request, DeviceContext device) {
        GoogleIdentity identity = googleIdentityService.verify(request.getCredential());

        Optional<User> existing = userRepository.findByEmail(identity.email());
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.isSuspended()) {
                throw new SuspendedAccountException(user.getSuspensionReason());
            }
            link(user, identity);
            return new GoogleSignInOutcome.SignedIn(buildAuthResponse(user, device));
        }

        String phone = request.getPhone();
        if (phone == null || phone.isBlank()) {
            return new GoogleSignInOutcome.NeedsProfile(GoogleSignupResponse.from(identity));
        }

        // A half-finished OTP signup for this address can never be completed now, and would
        // otherwise leave a live code pointing at an account created another way.
        registrationOtpService.discard(identity.email());

        User user = User.builder()
                .email(identity.email())
                // No password at all, rather than one nobody can use: see User.passwordHash.
                .passwordHash(null)
                .fullName(identity.fullName())
                .phone(phone.trim())
                .avatarUrl(identity.avatarUrl())
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .authProvider(AuthProvider.GOOGLE)
                .providerId(identity.subject())
                .build();
        user = userRepository.save(user);

        return new GoogleSignInOutcome.Created(buildAuthResponse(user, device));
    }

    /**
     * Records the Google account against an existing user so later sign-ins can be pinned to
     * the subject rather than the address alone.
     */
    private void link(User user, GoogleIdentity identity) {
        boolean changed = false;

        if (!Objects.equals(user.getProviderId(), identity.subject())) {
            user.setProviderId(identity.subject());
            changed = true;
        }

        // Only fills a gap - overwriting would replace a picture the user chose themselves.
        if (user.getAvatarUrl() == null && identity.avatarUrl() != null) {
            user.setAvatarUrl(identity.avatarUrl());
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }
    }

    /**
     * Signs a user in. Check order matters: lockout and password come first, so an account's
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

        // An account created through Google has no password to check. Saying so leaks nothing
        // signup's 409 does not already leak, and forgot-password can give it one
        // (PasswordResetService.reset).
        if (user.getPasswordHash() == null) {
            throw new InvalidCredentialsException(
                    "This account signs in with Google. Use the Google button, "
                            + "or use Forgot password to set one.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            registerFailedAttempt(user);
            throw new InvalidCredentialsException();
        }

        if (user.isSuspended()) {
            throw new SuspendedAccountException(user.getSuspensionReason());
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
     * Issues the access/refresh pair that completes a sign-in. The access token is short-lived;
     * the refresh token keeps the user signed in and, unlike the JWT, can be revoked
     * (requirement #2).
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

        // State can have changed since the chain started; a suspension must end the session
        // rather than be renewed straight past.
        if (user.isSuspended()) {
            refreshTokenService.revokeAllForUser(user.getId());
            throw new SuspendedAccountException(user.getSuspensionReason());
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
