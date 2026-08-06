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
 * The way back in for someone who has forgotten their password.
 *
 * <p>Three steps, each guarded by the same challenge row: ask for a reset and a six-digit code
 * goes to the address on the account; send the code back and the row is marked verified; then
 * post a new password against it. Nothing about the account changes until that last call.
 *
 * <p>Deliberately close to {@link RegistrationOtpService} - same code length, same
 * {@code app.otp.*} limits, same BCrypt-the-code rule, same refusal to say whether an unknown
 * challenge token or a wrong digit was the problem. Two differences are worth calling out:
 * the challenge survives verification (the caller still has a password to choose), and there
 * is no delete-then-reissue on a repeat request, because that would hand back an unlimited
 * supply of emails to anyone who knows an address.
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
     * Starts a reset and emails the code.
     *
     * <p>An address with no account is told so plainly. That does confirm whether someone is
     * registered, but signing up already gives the same answer with its 409, so nothing new
     * leaks - and the alternative is a user who mistyped their own email staring at a code
     * screen that could never accept anything.
     *
     * <p>The cooldown is checked <em>before</em> the old row is cleared. Nothing else in the
     * application rate-limits anything, so without this an endpoint that takes an email
     * address and sends mail to it is a free amplifier. Note that
     * {@link RegistrationOtpService#issue} deletes first and so resets its own cooldown; that
     * is safe there only because the caller has to re-submit a whole signup each time.
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
     * Re-sends a fresh code for a reset already in flight. The previous code stops working,
     * the attempt counter resets with it, and a challenge that had already been verified drops
     * back to unverified - a new code means the proof has to be given again.
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
     * Checks a submitted code and opens the password step.
     *
     * <p>The expiry is pushed back to a full window from now. Without that, verifying at
     * minute nine of a ten-minute code would leave sixty seconds to choose and confirm a
     * password - the code's lifetime is a limit on guessing it, not on typing afterwards.
     *
     * <p>{@code noRollbackFor} is load-bearing, not tidiness: every rejection here throws, and
     * a plain rollback would undo the very bookkeeping the rejection exists to record - the
     * attempt counter would reset on each wrong guess, and a burnt challenge would come back
     * to life. Same reason {@code AuthService.login} carries it for failed sign-ins.
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
     * Sets the new password and spends the challenge.
     *
     * <p>Three things happen alongside the password itself, and each of them is the point of
     * the exercise rather than a nicety:
     *
     * <ul>
     *   <li>the lockout is cleared, because being locked out is the most likely reason someone
     *       is here at all, and leaving it would mean the new password does not work either;
     *   <li>every refresh token is revoked, on the same reasoning as
     *       {@link UserProfileService#changePassword} - a reset is how someone reacts to
     *       thinking their account is compromised;
     *   <li>an account that had no password until now (signed up through Google) simply gains
     *       one. {@code authProvider} is left alone: Google sign-in keeps working, and
     *       {@code AuthService.login} only diverts accounts whose hash is null.
     * </ul>
     */
    @Transactional
    public void reset(String challengeToken, String newPassword) {
        PasswordResetChallenge challenge = require(challengeToken);

        if (challenge.isExpired(LocalDateTime.now())) {
            challengeRepository.delete(challenge);
            throw OtpException.expired();
        }

        // Same message as a wrong code: skipping the verify step is not a different kind of
        // failure to anyone entitled to be here.
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

    /**
     * Abandoned resets are worth nothing to anyone once expired, and nothing else ever deletes
     * them - a user who walks away never comes back to spend the row.
     */
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
                // An unknown token reads exactly like a wrong code, so this endpoint cannot be
                // used to find out whether a reset is in flight for someone.
                .orElseThrow(() -> OtpException.invalid(0));
    }

    /**
     * The account behind a challenge. The miss is only reachable if the account was deleted
     * mid-reset, in which case the challenge is worthless and reads as an unknown token.
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

        // Inside the transaction on purpose: if the mail server refuses the message the row
        // rolls back with it, so no address is held hostage by a code that never arrived.
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
