package com.sewasathi.service;

import com.sewasathi.entity.PasswordResetChallenge;
import com.sewasathi.entity.User;
import com.sewasathi.exception.OtpException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.PasswordResetChallengeRepository;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * The way back in for someone who has forgotten their password. Three steps guarded by one
 * challenge row: request a reset, send the emailed code back, then post a new password.
 * Nothing about the account changes until that last call. Mirrors
 * {@link RegistrationOtpService}, except the challenge survives verification and a repeat
 * request does not delete and reissue, which would be an unlimited supply of emails.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int CODE_BOUND = 1_000_000;

    private final PasswordResetChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;

    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiry-minutes:10}")
    private int expiryMinutes;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.otp.resend-cooldown-seconds:60}")
    private int resendCooldownSeconds;

    /** What the client needs to come back with the code, and what to tell the user meanwhile. */
    public record Challenge(String challengeToken,
                            String email,
                            long expiresInSeconds,
                            long resendAvailableInSeconds) {
    }

    /**
     * Starts a reset and emails the code. An address with no account is told so plainly - the
     * 409 on signup already leaks that, and the alternative strands a user who mistyped their
     * own address on a code screen. The cooldown is checked <em>before</em> the old row is
     * cleared, otherwise this endpoint is a free mail amplifier.
     */
    @Transactional
    public Challenge request(String rawEmail) {
        String email = rawEmail.trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No account found for that email address."));

        LocalDateTime now = LocalDateTime.now();
        challengeRepository.findByEmail(email).ifPresent(existing -> {
            long sinceLastSend = Duration.between(existing.getLastSentAt(), now).toSeconds();
            if (sinceLastSend < resendCooldownSeconds) {
                throw OtpException.resendTooSoon(resendCooldownSeconds - sinceLastSend);
            }
        });
        challengeRepository.deleteByEmail(email);

        PasswordResetChallenge challenge = PasswordResetChallenge.builder()
                .userId(user.getId())
                .email(email)
                .challengeToken(UUID.randomUUID().toString())
                .build();

        return sendCode(user, challenge);
    }

    /**
     * Re-sends a fresh code for a reset already in flight. The previous code stops working, the
     * attempt counter resets, and an already-verified challenge drops back to unverified.
     */
    @Transactional(noRollbackFor = OtpException.class)
    public Challenge resend(String challengeToken) {
        PasswordResetChallenge challenge = require(challengeToken);

        LocalDateTime now = LocalDateTime.now();
        if (challenge.isExpired(now)) {
            challengeRepository.delete(challenge);
            throw OtpException.expired();
        }

        long sinceLastSend = Duration.between(challenge.getLastSentAt(), now).toSeconds();
        if (sinceLastSend < resendCooldownSeconds) {
            throw OtpException.resendTooSoon(resendCooldownSeconds - sinceLastSend);
        }

        User user = requireUser(challenge);
        challenge.setVerifiedAt(null);
        return sendCode(user, challenge);
    }

    /**
     * Checks a submitted code and opens the password step. The expiry is pushed back to a full
     * window from now: the code's lifetime limits guessing it, not typing a password afterwards.
     * {@code noRollbackFor} is load-bearing - every rejection throws, and a plain rollback would
     * undo the attempt increment and revive a burnt challenge.
     */
    @Transactional(noRollbackFor = OtpException.class)
    public Challenge verify(String challengeToken, String code) {
        PasswordResetChallenge challenge = require(challengeToken);
        LocalDateTime now = LocalDateTime.now();

        if (challenge.isExpired(now)) {
            challengeRepository.delete(challenge);
            throw OtpException.expired();
        }

        if (challenge.getAttempts() >= maxAttempts) {
            challengeRepository.delete(challenge);
            throw OtpException.tooManyAttempts();
        }

        if (!passwordEncoder.matches(code, challenge.getOtpHash())) {
            int attempts = challenge.getAttempts() + 1;
            challenge.setAttempts(attempts);
            if (attempts >= maxAttempts) {
                // Burn the challenge rather than leave it to be ground down at leisure.
                challengeRepository.delete(challenge);
                throw OtpException.tooManyAttempts();
            }
            challengeRepository.save(challenge);
            throw OtpException.invalid(maxAttempts - attempts);
        }

        challenge.setVerifiedAt(now);
        challenge.setExpiresAt(now.plusMinutes(expiryMinutes));
        challengeRepository.save(challenge);

        return new Challenge(
                challenge.getChallengeToken(),
                challenge.getEmail(),
                Duration.ofMinutes(expiryMinutes).toSeconds(),
                resendCooldownSeconds);
    }

    /**
     * Sets the new password and spends the challenge. Three things happen alongside it:
     *
     * <ul>
     *   <li>the lockout is cleared, or the new password would not work either;
     *   <li>every refresh token is revoked, as in {@link UserProfileService#changePassword};
     *   <li>a Google-only account simply gains a password. {@code authProvider} is left alone,
     *       so Google sign-in keeps working.
     * </ul>
     */
    @Transactional
    public void reset(String challengeToken, String newPassword) {
        PasswordResetChallenge challenge = require(challengeToken);

        if (challenge.isExpired(LocalDateTime.now())) {
            challengeRepository.delete(challenge);
            throw OtpException.expired();
        }

        // Same message as a wrong code - skipping the verify step must not be distinguishable.
        if (!challenge.isVerified()) {
            throw OtpException.invalid(0);
        }

        User user = requireUser(challenge);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        refreshTokenService.revokeAllForUser(user.getId());
        challengeRepository.delete(challenge);
    }

    /** Nothing else deletes abandoned resets - a user who walks away never spends the row. */
    @Scheduled(cron = "0 25 3 * * *")
    @Transactional
    public void purgeExpired() {
        int removed = challengeRepository.deleteExpiredBefore(LocalDateTime.now());
        if (removed > 0) {
            log.info("Purged {} expired password reset challenge(s)", removed);
        }
    }

    private PasswordResetChallenge require(String challengeToken) {
        return challengeRepository.findByChallengeToken(challengeToken)
                // An unknown token reads exactly like a wrong code, so this endpoint cannot
                // reveal whether a reset is in flight.
                .orElseThrow(() -> OtpException.invalid(0));
    }

    /**
     * The account behind a challenge. Only missing if it was deleted mid-reset, in which case
     * the challenge reads as an unknown token.
     */
    private User requireUser(PasswordResetChallenge challenge) {
        return userRepository.findById(challenge.getUserId())
                .orElseThrow(() -> OtpException.invalid(0));
    }

    private Challenge sendCode(User user, PasswordResetChallenge challenge) {
        String code = String.format("%06d", random.nextInt(CODE_BOUND));
        LocalDateTime now = LocalDateTime.now();

        challenge.setOtpHash(passwordEncoder.encode(code));
        challenge.setAttempts(0);
        challenge.setLastSentAt(now);
        challenge.setExpiresAt(now.plusMinutes(expiryMinutes));
        challengeRepository.save(challenge);

        // Inside the transaction on purpose: if the mail server refuses, the row rolls back
        // with it rather than stranding the address behind a code that never arrived.
        emailService.sendTemplate(
                challenge.getEmail(),
                "Your Sewa Sathi password reset code",
                "email/otp",
                Map.of(
                        "name", firstName(user.getFullName()),
                        "reason", "Enter this code to choose a new Sewa Sathi password.",
                        "code", code,
                        "expiryMinutes", expiryMinutes));

        return new Challenge(
                challenge.getChallengeToken(),
                challenge.getEmail(),
                Duration.ofMinutes(expiryMinutes).toSeconds(),
                resendCooldownSeconds);
    }

    private String firstName(String fullName) {
        String trimmed = fullName == null ? "" : fullName.trim();
        int space = trimmed.indexOf(' ');
        return space > 0 ? trimmed.substring(0, space) : trimmed;
    }
}
