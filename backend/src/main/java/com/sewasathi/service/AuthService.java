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
import com.sewasathi.entity.PasswordResetToken;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.AccountLockedException;
import com.sewasathi.exception.DuplicateEmailException;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;
    private static final long RESET_TOKEN_EXPIRY_MINUTES = 60;
    private static final long VERIFY_TOKEN_EXPIRY_HOURS = 48;

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

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
        return buildAuthResponse(user);
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
        return buildAuthResponse(user);
    }

    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AuthResponse login(LoginRequest request) {
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

        return buildAuthResponse(user);
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
            emailService.send(
                    user.getEmail(),
                    "Reset your SewaSathi password",
                    "We received a request to reset your password. This link expires in "
                            + RESET_TOKEN_EXPIRY_MINUTES + " minutes:\n" + link
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

    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
        if (!user.isEmailVerified()) {
            sendVerificationEmail(user);
        }
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
        emailService.send(
                user.getEmail(),
                "Verify your SewaSathi email",
                "Welcome to SewaSathi! Please verify your email address:\n" + link
                        + "\n\nThis link expires "
                        + verificationToken.getExpiresAt().format(DateTimeFormatter.ofPattern("MMM d, yyyy HH:mm"))
                        + "."
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
        return new AuthResponse(token, UserResponse.from(user));
    }
}
