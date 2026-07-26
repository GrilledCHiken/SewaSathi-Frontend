package com.sewasathi.service;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.KnownDevice;
import com.sewasathi.entity.OtpPurpose;
import com.sewasathi.entity.OtpToken;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.OtpException;
import com.sewasathi.repository.KnownDeviceRepository;
import com.sewasathi.repository.OtpTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The one-time-code path is the second factor protecting every account, so its failure modes
 * matter more than its happy path: an unbounded retry count or a code stored in plaintext
 * would each quietly defeat the whole feature.
 */
@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpTokenRepository otpTokenRepository;

    @Mock
    private KnownDeviceRepository knownDeviceRepository;

    @Mock
    private EmailService emailService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final DeviceContext DEVICE =
            new DeviceContext("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", "203.0.113.7");

    private OtpService otpService;
    private User user;

    @BeforeEach
    void setUp() {
        otpService = new OtpService(otpTokenRepository, knownDeviceRepository, passwordEncoder, emailService);
        user = User.builder()
                .id(1L).email("customer@example.com").fullName("Test Customer")
                .phone("9800000000").role(Role.CUSTOMER).status(ApprovalStatus.APPROVED)
                .emailVerified(true).build();
    }

    private OtpToken capturedToken() {
        ArgumentCaptor<OtpToken> captor = ArgumentCaptor.forClass(OtpToken.class);
        verify(otpTokenRepository).save(captor.capture());
        return captor.getValue();
    }

    private String capturedCode() {
        ArgumentCaptor<Map<String, Object>> model = captureModel();
        return model.getValue().get("code").toString();
    }

    @SuppressWarnings("unchecked")
    private ArgumentCaptor<Map<String, Object>> captureModel() {
        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService).sendTemplate(anyString(), anyString(), anyString(), model.capture());
        return model;
    }

    @Test
    void issue_storesOnlyAHashOfTheCode() {
        when(otpTokenRepository.findByUserAndConsumedFalse(user)).thenReturn(List.of());

        otpService.issue(user, OtpPurpose.LOGIN_2FA, DEVICE);

        OtpToken saved = capturedToken();
        String emailedCode = capturedCode();

        // A database leak must not hand an attacker live sign-in codes.
        assertThat(saved.getCodeHash()).isNotEqualTo(emailedCode);
        assertThat(saved.getCodeHash()).startsWith("$2");
        assertThat(passwordEncoder.matches(emailedCode, saved.getCodeHash())).isTrue();
    }

    @Test
    void issue_generatesASixDigitCode_zeroPadded() {
        when(otpTokenRepository.findByUserAndConsumedFalse(user)).thenReturn(List.of());

        otpService.issue(user, OtpPurpose.LOGIN_2FA, DEVICE);

        // String.format("%06d") matters: an unpadded 42 would be a two-digit code.
        assertThat(capturedCode()).matches("\\d{6}");
    }

    @Test
    void issue_supersedesAnyOutstandingChallenges() {
        OtpToken stale = OtpToken.builder().id(9L).user(user).consumed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(otpTokenRepository.findByUserAndConsumedFalse(user)).thenReturn(List.of(stale));

        otpService.issue(user, OtpPurpose.LOGIN_2FA, DEVICE);

        // Clicking "resend" three times must not leave three usable codes behind.
        assertThat(stale.isConsumed()).isTrue();
    }

    @Test
    void verify_correctCode_consumesTheTokenAndReturnsTheUser() {
        OtpToken token = liveToken("123456");
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));
        when(knownDeviceRepository.findByUserAndFingerprint(user, token.getDeviceFingerprint()))
                .thenReturn(Optional.empty());

        User result = otpService.verify("chal", "123456");

        assertThat(result).isSameAs(user);
        assertThat(token.isConsumed()).isTrue();
    }

    @Test
    void verify_correctCodeTwice_isRejectedTheSecondTime() {
        OtpToken token = liveToken("123456");
        token.setConsumed(true);
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> otpService.verify("chal", "123456"))
                .isInstanceOf(OtpException.class);
    }

    @Test
    void verify_wrongCode_incrementsAttempts() {
        OtpToken token = liveToken("123456");
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> otpService.verify("chal", "000000"))
                .isInstanceOf(OtpException.class);

        assertThat(token.getAttempts()).isEqualTo(1);
        assertThat(token.isConsumed()).isFalse();
    }

    @Test
    void verify_fifthWrongCode_burnsTheToken() {
        OtpToken token = liveToken("123456");
        token.setAttempts(4);
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> otpService.verify("chal", "000000"))
                .isInstanceOf(OtpException.class);

        // Six digits is only a million possibilities; without a cap this is brute-forceable.
        assertThat(token.getAttempts()).isEqualTo(5);
        assertThat(token.isConsumed()).isTrue();
    }

    @Test
    void verify_afterTheCapIsReached_rejectsEvenTheCorrectCode() {
        OtpToken token = liveToken("123456");
        token.setAttempts(5);
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> otpService.verify("chal", "123456"))
                .isInstanceOf(OtpException.class);
    }

    @Test
    void verify_expiredToken_isRejected() {
        OtpToken token = liveToken("123456");
        token.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> otpService.verify("chal", "123456"))
                .isInstanceOf(OtpException.class);
    }

    @Test
    void verify_unknownChallengeToken_isRejected() {
        when(otpTokenRepository.findByChallengeToken("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> otpService.verify("nope", "123456"))
                .isInstanceOf(OtpException.class);
    }

    @Test
    void verify_newDeviceChallenge_recordsTheDeviceAndSendsAnAlert() {
        OtpToken token = liveToken("123456");
        token.setPurpose(OtpPurpose.NEW_DEVICE);
        when(otpTokenRepository.findByChallengeToken("chal")).thenReturn(Optional.of(token));
        when(knownDeviceRepository.findByUserAndFingerprint(user, token.getDeviceFingerprint()))
                .thenReturn(Optional.empty());

        otpService.verify("chal", "123456");

        verify(knownDeviceRepository).save(any(KnownDevice.class));
        verify(emailService).sendTemplate(anyString(), anyString(),
                org.mockito.ArgumentMatchers.eq("email/new-device-alert"), anyMap());
    }

    @Test
    void isNewDevice_firstEverSignIn_isNotChallenged() {
        when(knownDeviceRepository.existsByUser(user)).thenReturn(false);

        // Nothing to be "different" from; challenging here would just be a second
        // verification email on top of the one registration already sent.
        assertThat(otpService.isNewDevice(user, DEVICE)).isFalse();
        verify(knownDeviceRepository, never()).existsByUserAndFingerprint(any(), anyString());
    }

    @Test
    void isNewDevice_knownAccountUnknownFingerprint_isChallenged() {
        when(knownDeviceRepository.existsByUser(user)).thenReturn(true);
        when(knownDeviceRepository.existsByUserAndFingerprint(user, DEVICE.fingerprint())).thenReturn(false);

        assertThat(otpService.isNewDevice(user, DEVICE)).isTrue();
    }

    @Test
    void isNewDevice_recognisedFingerprint_isNotChallenged() {
        when(knownDeviceRepository.existsByUser(user)).thenReturn(true);
        when(knownDeviceRepository.existsByUserAndFingerprint(user, DEVICE.fingerprint())).thenReturn(true);

        assertThat(otpService.isNewDevice(user, DEVICE)).isFalse();
    }

    private OtpToken liveToken(String code) {
        return OtpToken.builder()
                .id(1L)
                .user(user)
                .challengeToken("chal")
                .codeHash(passwordEncoder.encode(code))
                .purpose(OtpPurpose.LOGIN_2FA)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .deviceFingerprint(DEVICE.fingerprint())
                .deviceLabel(DEVICE.label())
                .attempts(0)
                .consumed(false)
                .build();
    }
}
