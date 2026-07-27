package com.sewasathi.service;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.RefreshToken;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidTokenException;
import com.sewasathi.repository.RefreshTokenRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Covers the three rules that turn a stateless API into managed sessions (requirement #2):
 * rotation, reuse detection, and the idle timeout.
 */
@SpringBootTest
@ActiveProfiles("test")
class RefreshTokenServiceTest {

    private static final DeviceContext DEVICE =
            new DeviceContext("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", "203.0.113.7");

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    private User user;

    @BeforeEach
    void createUser() {
        user = userRepository.save(User.builder()
                .email("refresh-" + System.nanoTime() + "@example.com")
                .passwordHash("x")
                .fullName("Refresh Tester")
                .phone("9800000022")
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .build());
    }

    // ---------- issue ----------

    @Test
    void issuedTokenIsStoredOnlyAsAHash() {
        String raw = refreshTokenService.issue(user, DEVICE);

        assertThat(raw).isNotBlank();
        assertThat(refreshTokenRepository.findByTokenHash(raw))
                .as("the raw token must not be a key in the table")
                .isEmpty();
        assertThat(refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(raw)))
                .isPresent();
    }

    @Test
    void issuedTokenRecordsTheDevice() {
        String raw = refreshTokenService.issue(user, DEVICE);

        RefreshToken stored = refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(raw)).orElseThrow();
        assertThat(stored.getDeviceLabel()).isEqualTo("Chrome on Windows");
        assertThat(stored.getUser().getId()).isEqualTo(user.getId());
    }

    // ---------- rotation ----------

    @Test
    void rotatingSpendsTheOldTokenAndIssuesANewOne() {
        String first = refreshTokenService.issue(user, DEVICE);

        RefreshTokenService.RotationResult result = refreshTokenService.rotate(first, DEVICE);

        assertThat(result.refreshToken()).isNotEqualTo(first);
        assertThat(result.user().getId()).isEqualTo(user.getId());
        assertThat(refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(first)).orElseThrow().isRevoked())
                .as("the presented token should be spent")
                .isTrue();
        assertThat(refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(result.refreshToken()))
                .orElseThrow().isRevoked())
                .isFalse();
    }

    @Test
    void rotationKeepsTheChainInOneFamilyAndDoesNotExtendItsLifetime() {
        String first = refreshTokenService.issue(user, DEVICE);
        RefreshToken original = refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(first)).orElseThrow();

        String second = refreshTokenService.rotate(first, DEVICE).refreshToken();
        RefreshToken replacement = refreshTokenRepository
                .findByTokenHash(RefreshTokenService.hash(second)).orElseThrow();

        assertThat(replacement.getFamilyId()).isEqualTo(original.getFamilyId());
        assertThat(replacement.getExpiresAt())
                .as("refreshing must not push the session's hard expiry back")
                .isEqualTo(original.getExpiresAt());
    }

    // ---------- reuse detection ----------

    /**
     * The important case. A token turning up twice means one of the two holders is not the
     * real client and there is no way to tell which, so both are cut off.
     */
    @Test
    void replayingASpentTokenRevokesTheWholeChain() {
        String first = refreshTokenService.issue(user, DEVICE);
        String second = refreshTokenService.rotate(first, DEVICE).refreshToken();

        assertThatThrownBy(() -> refreshTokenService.rotate(first, DEVICE))
                .isInstanceOf(InvalidTokenException.class);

        assertThat(refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(second)).orElseThrow().isRevoked())
                .as("the legitimate client's current token must be revoked too")
                .isTrue();
        assertThatThrownBy(() -> refreshTokenService.rotate(second, DEVICE))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void anUnknownTokenIsRejected() {
        assertThatThrownBy(() -> refreshTokenService.rotate("not-a-real-token", DEVICE))
                .isInstanceOf(InvalidTokenException.class);
    }

    // ---------- expiry and idle timeout ----------

    @Test
    void anExpiredTokenIsRejected() {
        String raw = refreshTokenService.issue(user, DEVICE);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(raw)).orElseThrow();
        stored.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        refreshTokenRepository.save(stored);

        assertThatThrownBy(() -> refreshTokenService.rotate(raw, DEVICE))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");
    }

    /**
     * Idle timeout is separate from absolute expiry: a week-long token still dies after
     * 30 minutes of nobody touching it.
     */
    @Test
    void aSessionIdleBeyondTheTimeoutIsRejectedEvenThoughItHasNotExpired() {
        String raw = refreshTokenService.issue(user, DEVICE);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(raw)).orElseThrow();
        stored.setLastUsedAt(LocalDateTime.now().minusHours(2));
        refreshTokenRepository.save(stored);

        assertThat(stored.getExpiresAt()).isAfter(LocalDateTime.now());

        assertThatThrownBy(() -> refreshTokenService.rotate(raw, DEVICE))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("inactivity");
    }

    // ---------- revocation ----------

    @Test
    void revokingOneTokenLeavesOtherSessionsSignedIn() {
        String phone = refreshTokenService.issue(user, DEVICE);
        String laptop = refreshTokenService.issue(user, DEVICE);

        refreshTokenService.revoke(phone);

        assertThatThrownBy(() -> refreshTokenService.rotate(phone, DEVICE))
                .isInstanceOf(InvalidTokenException.class);
        assertThat(refreshTokenService.rotate(laptop, DEVICE).refreshToken()).isNotBlank();
    }

    @Test
    void revokingEverythingSignsOutAllDevices() {
        String phone = refreshTokenService.issue(user, DEVICE);
        String laptop = refreshTokenService.issue(user, DEVICE);

        assertThat(refreshTokenService.activeSessionCount(user.getId())).isEqualTo(2);

        refreshTokenService.revokeAllForUser(user.getId());

        assertThat(refreshTokenService.activeSessionCount(user.getId())).isZero();
        assertThatThrownBy(() -> refreshTokenService.rotate(phone, DEVICE))
                .isInstanceOf(InvalidTokenException.class);
        assertThatThrownBy(() -> refreshTokenService.rotate(laptop, DEVICE))
                .isInstanceOf(InvalidTokenException.class);
    }

    // ---------- housekeeping ----------

    @Test
    void purgeRemovesTokensThatArePastTheirAbsoluteExpiry() {
        String raw = refreshTokenService.issue(user, DEVICE);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(raw)).orElseThrow();
        stored.setExpiresAt(LocalDateTime.now().minusDays(1));
        refreshTokenRepository.save(stored);

        refreshTokenService.purgeExpired();

        assertThat(refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(raw))).isEmpty();
    }

    /** A shorter idle window must be honoured without touching code. */
    @Test
    void theIdleWindowIsConfigurable() {
        assertThat(ReflectionTestUtils.getField(refreshTokenService, "idleTimeoutMs"))
                .isEqualTo(1_800_000L);
    }
}
