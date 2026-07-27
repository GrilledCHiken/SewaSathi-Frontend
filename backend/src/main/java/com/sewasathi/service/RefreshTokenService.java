package com.sewasathi.service;

import com.sewasathi.entity.RefreshToken;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidTokenException;
import com.sewasathi.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Issues, rotates and revokes refresh tokens (requirement #2).
 *
 * <p>Three rules give a stateless API real session management:
 *
 * <ul>
 *   <li><b>Rotation</b> - every exchange spends the presented token and issues a new one, so
 *       a captured token is useful only until the legitimate client next refreshes.</li>
 *   <li><b>Reuse detection</b> - a token presented twice means one of the two holders is not
 *       the real client, and there is no way to tell which, so the entire chain is revoked
 *       and both are forced to sign in again.</li>
 *   <li><b>Idle timeout</b> - a chain nobody has used inside the idle window is finished,
 *       independent of its absolute expiry.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    /** Commits chain revocations independently - see {@link RefreshTokenRevoker}. */
    private final RefreshTokenRevoker revoker;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    /** How long a session may sit untouched before it has to be re-established. */
    @Value("${app.session.idle-timeout-ms}")
    private long idleTimeoutMs;

    /** Starts a new chain. Called once per sign-in. */
    @Transactional
    public String issue(User user, DeviceContext device) {
        return persist(user, UUID.randomUUID().toString(), device != null ? device.label() : null);
    }

    /**
     * Spends {@code rawToken} and returns its replacement.
     *
     * @throws InvalidTokenException if the token is unknown, already spent, expired, or the
     *                               session has been idle past the timeout
     */
    @Transactional
    public RotationResult rotate(String rawToken, DeviceContext device) {
        LocalDateTime now = LocalDateTime.now();
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidTokenException("That session is no longer valid. Please sign in again."));

        if (existing.isRevoked()) {
            // Someone is presenting a token that was already exchanged. Either it leaked or a
            // client is replaying; either way the chain can no longer be trusted.
            int killed = revoker.revokeFamily(existing.getFamilyId(), now);
            log.warn("Refresh token reuse detected for user {}; revoked {} token(s) in family {}",
                    existing.getUser().getId(), killed, existing.getFamilyId());
            throw new InvalidTokenException("That session is no longer valid. Please sign in again.");
        }

        if (existing.isExpired(now)) {
            throw new InvalidTokenException("Your session has expired. Please sign in again.");
        }

        if (existing.lastActivity().plus(Duration.ofMillis(idleTimeoutMs)).isBefore(now)) {
            revoker.revokeFamily(existing.getFamilyId(), now);
            throw new InvalidTokenException("You were signed out after a period of inactivity.");
        }

        existing.setRevokedAt(now);
        existing.setLastUsedAt(now);
        refreshTokenRepository.save(existing);

        // The replacement inherits the family and the original absolute expiry: rotating must
        // not let a chain live forever by repeatedly pushing its end date back.
        String replacement = persist(
                existing.getUser(), existing.getFamilyId(), existing.getDeviceLabel(), existing.getExpiresAt());

        return new RotationResult(existing.getUser(), replacement);
    }

    /** Ends one session. The other devices a user is signed in on are unaffected. */
    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    /** Ends every session for a user - "sign out everywhere", and after a password change. */
    @Transactional
    public int revokeAllForUser(Long userId) {
        return refreshTokenRepository.revokeAllForUser(userId, LocalDateTime.now());
    }

    public long activeSessionCount(Long userId) {
        return refreshTokenRepository.countByUserIdAndRevokedAtIsNull(userId);
    }

    /**
     * Rotation writes a row per refresh, so the table would grow without bound. Expired rows
     * are useless to everyone, including auditing, once past their absolute expiry.
     */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpired() {
        int removed = refreshTokenRepository.deleteExpiredBefore(LocalDateTime.now());
        if (removed > 0) {
            log.info("Purged {} expired refresh token(s)", removed);
        }
    }

    private String persist(User user, String familyId, String deviceLabel) {
        return persist(user, familyId, deviceLabel,
                LocalDateTime.now().plus(Duration.ofMillis(refreshExpirationMs)));
    }

    private String persist(User user, String familyId, String deviceLabel, LocalDateTime expiresAt) {
        String raw = generateToken();
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(raw))
                .familyId(familyId)
                .deviceLabel(deviceLabel)
                .expiresAt(expiresAt)
                .build());
        return raw;
    }

    /** 256 bits from a CSPRNG, URL-safe so it survives being put in a JSON body or header. */
    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Plain SHA-256 rather than BCrypt: the token is 256 bits of random data, so there is no
     * guessable input to slow an attacker down over, and lookups happen on every refresh.
     */
    static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** The user the spent token belonged to, plus its replacement. */
    public record RotationResult(User user, String refreshToken) {
    }
}
