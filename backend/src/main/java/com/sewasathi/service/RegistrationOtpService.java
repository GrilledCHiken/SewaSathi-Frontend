package com.sewasathi.service;

import com.sewasathi.entity.PendingRegistration;
import com.sewasathi.exception.OtpException;
import com.sewasathi.repository.PendingRegistrationRepository;
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
 * The verification code standing between a submitted signup and a real account. Owns the
 * code's whole life - issuing, checking, resending, expiring - so {@link AuthService} keeps
 * dealing in accounts. The code is checked against a BCrypt hash, wrong guesses are capped by
 * {@code app.otp.max-attempts} (the row is destroyed at the cap), and the challenge dies after
 * {@code app.otp.expiry-minutes}.
 */
@Service
@RequiredArgsConstructor
public class RegistrationOtpService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationOtpService.class);
    private static final int CODE_BOUND = 1_000_000;

    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

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
     * Stores a submitted signup and emails its code. Any earlier attempt on the same address is
     * dropped first, so the unique index cannot turn away someone who gave up and came back.
     * The send is inside the transaction: a refusal rolls the pending row back rather than
     * stranding the address behind a code that never arrived.
     */
    @Transactional
    public Challenge issue(PendingRegistration draft) {
        pendingRegistrationRepository.deleteByEmail(draft.getEmail());
        draft.setChallengeToken(UUID.randomUUID().toString());
        return sendCode(draft);
    }

    /**
     * Re-sends a fresh code for an in-flight challenge. The previous code stops working and the
     * attempt counter resets with it.
     */
    @Transactional(noRollbackFor = OtpException.class)
    public Challenge resend(String challengeToken) {
        PendingRegistration pending = require(challengeToken);

        LocalDateTime now = LocalDateTime.now();
        if (pending.isExpired(now)) {
            pendingRegistrationRepository.delete(pending);
            throw OtpException.expired();
        }

        long sinceLastSend = Duration.between(pending.getLastSentAt(), now).toSeconds();
        if (sinceLastSend < resendCooldownSeconds) {
            throw OtpException.resendTooSoon(resendCooldownSeconds - sinceLastSend);
        }

        return sendCode(pending);
    }

    /**
     * Checks a submitted code and hands back the signup behind it. The row is left in place:
     * the caller still has to create the account, and deleting the challenge before that
     * succeeds would strand the user with nothing to retry.
     */
    /**
     * {@code noRollbackFor} is load-bearing: every rejection throws, and a plain rollback would
     * undo the attempt increment and revive a burnt challenge.
     */
    @Transactional(noRollbackFor = OtpException.class)
    public PendingRegistration verify(String challengeToken, String code) {
        PendingRegistration pending = require(challengeToken);

        if (pending.isExpired(LocalDateTime.now())) {
            pendingRegistrationRepository.delete(pending);
            throw OtpException.expired();
        }

        if (pending.getAttempts() >= maxAttempts) {
            pendingRegistrationRepository.delete(pending);
            throw OtpException.tooManyAttempts();
        }

        if (!passwordEncoder.matches(code, pending.getOtpHash())) {
            int attempts = pending.getAttempts() + 1;
            pending.setAttempts(attempts);
            if (attempts >= maxAttempts) {
                // Burn the challenge rather than leave it to be ground down at leisure.
                pendingRegistrationRepository.delete(pending);
                throw OtpException.tooManyAttempts();
            }
            pendingRegistrationRepository.save(pending);
            throw OtpException.invalid(maxAttempts - attempts);
        }

        return pending;
    }

    /** Spends a challenge once the account it was guarding exists. */
    @Transactional
    public void consume(PendingRegistration pending) {
        pendingRegistrationRepository.delete(pending);
    }

    /**
     * Throws away any challenge outstanding for an address, for when the account is created
     * another way. Otherwise a stale code stays live for an account that now exists.
     */
    @Transactional
    public void discard(String email) {
        pendingRegistrationRepository.deleteByEmail(email);
    }

    /** Nothing else deletes abandoned signups - a user who walks away never spends the row. */
    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    public void purgeExpired() {
        int removed = pendingRegistrationRepository.deleteExpiredBefore(LocalDateTime.now());
        if (removed > 0) {
            log.info("Purged {} expired pending registration(s)", removed);
        }
    }

    private PendingRegistration require(String challengeToken) {
        return pendingRegistrationRepository.findByChallengeToken(challengeToken)
                // An unknown token reads exactly like a wrong code, so this endpoint cannot
                // reveal whether a signup is in flight.
                .orElseThrow(() -> OtpException.invalid(0));
    }

    private Challenge sendCode(PendingRegistration pending) {
        String code = String.format("%06d", random.nextInt(CODE_BOUND));
        LocalDateTime now = LocalDateTime.now();

        pending.setOtpHash(passwordEncoder.encode(code));
        pending.setAttempts(0);
        pending.setLastSentAt(now);
        pending.setExpiresAt(now.plusMinutes(expiryMinutes));
        pendingRegistrationRepository.save(pending);

        emailService.sendTemplate(
                pending.getEmail(),
                "Your Sewa Sathi verification code",
                "email/otp",
                Map.of(
                        "name", firstName(pending.getFullName()),
                        "reason", "Enter this code to finish creating your Sewa Sathi account.",
                        "code", code,
                        "expiryMinutes", expiryMinutes));

        return new Challenge(
                pending.getChallengeToken(),
                pending.getEmail(),
                Duration.ofMinutes(expiryMinutes).toSeconds(),
                resendCooldownSeconds);
    }

    private String firstName(String fullName) {
        String trimmed = fullName == null ? "" : fullName.trim();
        int space = trimmed.indexOf(' ');
        return space > 0 ? trimmed.substring(0, space) : trimmed;
    }
}
