package com.sewasathi.service;

import com.sewasathi.dto.request.ForgotPasswordRequest;
import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.ResetPasswordRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.EmailVerificationToken;
import com.sewasathi.entity.OtpPurpose;
import com.sewasathi.entity.PasswordResetToken;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
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
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;
    private static final long RESET_TOKEN_EXPIRY_MINUTES = 60;
    private static final long VERIFY_TOKEN_EXPIRY_HOURS = 48;
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("MMM d, yyyy HH:mm");

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final OtpService otpService;

    @Value("${app.frontend-url:http://localhost:5174}")
    private String frontendUrl;

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
                .emailVerified(false)
                .build();

        user = userRepository.save(user);
        sendVerificationEmail(user);
        // Deliberately no token: the account must confirm its email address before it can
        // sign in. Handing out a working 24h token here would make the verification step
        // decorative, which is exactly what it used to be.
        return AuthResponse.pendingVerification(UserResponse.from(user));
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
                .status(ApprovalStatus.PENDING)
                .emailVerified(false)
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

        sendVerificationEmail(user);
        return AuthResponse.pendingVerification(UserResponse.from(user));
    }

    /**
     * Signs a user in, or raises a second-factor challenge.
     *
     * <p>The order of the checks matters. Lockout and password come first, so neither the
     * verification state nor the 2FA state of an account can be probed without the correct
     * password. Only once the password is proven do the account-state checks run.
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

        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }

        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        if (user.isTwoFactorEnabled()) {
            return AuthResponse.challenge(
                    otpService.issue(user, OtpPurpose.LOGIN_2FA, device),
                    "Two-factor authentication is on for this account.");
        }

        if (otpService.isNewDevice(user, device)) {
            return AuthResponse.challenge(
                    otpService.issue(user, OtpPurpose.NEW_DEVICE, device),
                    "This is the first sign-in from this device.");
        }

        // Recognised device (or the account's very first sign-in): record it and proceed.
        otpService.trustDevice(user, device);
        return buildAuthResponse(user);
    }

    /**
     * Completes a challenged sign-in. The challenge token identifies the account, so the
     * caller never re-sends the email address and cannot swap it for someone else's.
     */
    @Transactional
    public AuthResponse verifyOtp(String challengeToken, String code) {
        User user = otpService.verify(challengeToken, code);

        // Re-check account state: suspension or a lockout could have landed between the
        // challenge being issued and the code coming back.
        if (user.isSuspended()) {
            throw new SuspendedAccountException();
        }
        return buildAuthResponse(user);
    }

    @Transactional
    public void setTwoFactor(String email, boolean enabled) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
        user.setTwoFactorEnabled(enabled);
        userRepository.save(user);
    }

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
        return UserResponse.from(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        userRepository.findByEmail(email).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(token)
                    .expiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            String link = frontendUrl + "/reset-password?token=" + token;
            // Values are materialised here rather than passing the entity: SmtpEmailService
            // renders on another thread, after this transaction (and its persistence
            // context) has closed.
            emailService.sendTemplate(
                    user.getEmail(),
                    "Reset your Sewa Sathi password",
                    "email/password-reset",
                    Map.of(
                            "name", user.getFullName(),
                            "actionUrl", link,
                            "expiryMinutes", RESET_TOKEN_EXPIRY_MINUTES
                    )
            );
        });
        // Intentionally do not reveal whether the email exists - caller always gets a generic response.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new InvalidTokenException("This reset link is invalid or has expired."));

        if (resetToken.isUsed() || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("This reset link is invalid or has expired.");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new InvalidTokenException("This verification link is invalid or has expired."));

        if (verificationToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException("This verification link is invalid or has expired.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        emailVerificationTokenRepository.delete(verificationToken);
    }

    /**
     * Re-sends the activation link. Public by necessity - an unverified account cannot sign
     * in, so it could never authenticate to request one.
     *
     * <p>Returns silently for unknown or already-verified addresses, matching
     * {@link #forgotPassword}: the response must not reveal which addresses have accounts.
     */
    @Transactional
    public void resendVerification(String email) {
        userRepository.findByEmail(email.trim().toLowerCase())
                .filter(user -> !user.isEmailVerified())
                .ifPresent(this::sendVerificationEmail);
    }

    private void sendVerificationEmail(User user) {
        String token = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(VERIFY_TOKEN_EXPIRY_HOURS))
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        String link = frontendUrl + "/verify-email?token=" + token;
        emailService.sendTemplate(
                user.getEmail(),
                "Verify your Sewa Sathi email",
                "email/verification",
                Map.of(
                        "name", user.getFullName(),
                        "actionUrl", link,
                        "expiresAt", verificationToken.getExpiresAt().format(DISPLAY_DATE)
                )
        );
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

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtService.generateToken(user.getEmail());
        return AuthResponse.authenticated(token, UserResponse.from(user));
    }
}
