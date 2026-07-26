package com.sewasathi.service;

import com.sewasathi.entity.KnownDevice;
import com.sewasathi.entity.OtpPurpose;
import com.sewasathi.entity.OtpToken;
import com.sewasathi.entity.User;
import com.sewasathi.exception.OtpException;
import com.sewasathi.repository.KnownDeviceRepository;
import com.sewasathi.repository.OtpTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Issues and verifies the emailed 6-digit codes used for two-factor authentication and for
 * sign-ins from an unrecognised device.
 *
 * <p>Design notes worth keeping:
 * <ul>
 *   <li>Codes are generated with {@link SecureRandom}, never {@code Math.random()}.</li>
 *   <li>Only a BCrypt hash is persisted, so a database leak yields no usable codes.</li>
 *   <li>Issuing a new challenge consumes any outstanding ones, so a user who clicks
 *       "resend" three times does not leave three live codes behind.</li>
 *   <li>Five wrong guesses burn the token. A 6-digit code is only a million possibilities;
 *       without a cap it is brute-forceable in minutes.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);

    static final long EXPIRY_MINUTES = 5;
    static final int MAX_ATTEMPTS = 5;
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("MMM d, yyyy HH:mm");

    private final OtpTokenRepository otpTokenRepository;
    private final KnownDeviceRepository knownDeviceRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    /**
     * Creates a challenge, emails the code, and returns the opaque handle the client must
     * present alongside the code.
     */
    @Transactional
    public String issue(User user, OtpPurpose purpose, DeviceContext device) {
        // Supersede anything still outstanding for this user.
        otpTokenRepository.findByUserAndConsumedFalse(user)
                .forEach(stale -> stale.setConsumed(true));

        String code = generateCode();
        String challengeToken = UUID.randomUUID().toString();

        OtpToken token = OtpToken.builder()
                .user(user)
                .challengeToken(challengeToken)
                .codeHash(passwordEncoder.encode(code))
                .purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES))
                .deviceFingerprint(device.fingerprint())
                .deviceLabel(device.label())
                .build();
        otpTokenRepository.save(token);

        emailService.sendTemplate(
                user.getEmail(),
                "Your Sewa Sathi sign-in code",
                "email/otp",
                Map.of(
                        "name", user.getFullName(),
                        "code", code,
                        "reason", purpose == OtpPurpose.NEW_DEVICE
                                ? "We noticed a sign-in from a device you have not used before. "
                                  + "Enter this code to continue."
                                : "Two-factor authentication is on for your account. "
                                  + "Enter this code to finish signing in.",
                        "expiryMinutes", EXPIRY_MINUTES
                )
        );

        log.info("Issued {} challenge for user {}", purpose, user.getId());
        return challengeToken;
    }

    /**
     * Checks a submitted code and, on success, consumes the challenge and remembers the
     * device. Returns the user the challenge belonged to.
     */
    @Transactional
    public User verify(String challengeToken, String submittedCode) {
        OtpToken token = otpTokenRepository.findByChallengeToken(challengeToken)
                .orElseThrow(OtpException::invalid);

        if (token.isConsumed() || token.isExpired() || token.getAttempts() >= MAX_ATTEMPTS) {
            throw OtpException.invalid();
        }

        if (!passwordEncoder.matches(submittedCode, token.getCodeHash())) {
            token.setAttempts(token.getAttempts() + 1);
            if (token.getAttempts() >= MAX_ATTEMPTS) {
                token.setConsumed(true);
                log.warn("OTP challenge {} burned after {} failed attempts", token.getId(), MAX_ATTEMPTS);
            }
            otpTokenRepository.save(token);
            throw OtpException.invalid();
        }

        token.setConsumed(true);
        otpTokenRepository.save(token);

        User user = token.getUser();
        rememberDevice(user, token);
        return user;
    }

    /**
     * True when this account has signed in before but never from this device. A brand-new
     * account with no devices on record is not challenged - its first sign-in has nothing
     * to be "different" from, and challenging it would just be a second verification email.
     */
    @Transactional(readOnly = true)
    public boolean isNewDevice(User user, DeviceContext device) {
        if (!knownDeviceRepository.existsByUser(user)) {
            return false;
        }
        return !knownDeviceRepository.existsByUserAndFingerprint(user, device.fingerprint());
    }

    /** Records a device as seen, without a challenge. Used for a user's very first sign-in. */
    @Transactional
    public void trustDevice(User user, DeviceContext device) {
        upsert(user, device.fingerprint(), device.label());
    }

    private void rememberDevice(User user, OtpToken token) {
        if (token.getDeviceFingerprint() == null) {
            return;
        }
        boolean firstTimeSeen = upsert(user, token.getDeviceFingerprint(), token.getDeviceLabel());

        if (firstTimeSeen && token.getPurpose() == OtpPurpose.NEW_DEVICE) {
            Map<String, String> details = new LinkedHashMap<>();
            details.put("Device", token.getDeviceLabel());
            details.put("When", LocalDateTime.now().format(WHEN));

            emailService.sendTemplate(
                    user.getEmail(),
                    "New sign-in to your Sewa Sathi account",
                    "email/new-device-alert",
                    Map.of("name", user.getFullName(), "details", details)
            );
        }
    }

    /** @return true when the device was newly recorded rather than merely touched. */
    private boolean upsert(User user, String fingerprint, String label) {
        return knownDeviceRepository.findByUserAndFingerprint(user, fingerprint)
                .map(existing -> {
                    existing.setLastSeenAt(LocalDateTime.now());
                    knownDeviceRepository.save(existing);
                    return false;
                })
                .orElseGet(() -> {
                    knownDeviceRepository.save(KnownDevice.builder()
                            .user(user)
                            .fingerprint(fingerprint)
                            .label(label == null ? "Unknown device" : label)
                            .lastSeenAt(LocalDateTime.now())
                            .build());
                    return true;
                });
    }

    /** Zero-padded so every code is exactly six digits - "000042" must not become "42". */
    private String generateCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
