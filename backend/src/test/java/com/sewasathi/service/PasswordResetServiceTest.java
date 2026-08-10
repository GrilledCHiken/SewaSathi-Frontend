package com.sewasathi.service;

import com.sewasathi.entity.PasswordResetChallenge;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.OtpException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.PasswordResetChallengeRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    private static final int MAX_ATTEMPTS = 5;
    private static final int EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final String EMAIL = "forgetful@example.com";

    @Mock
    private PasswordResetChallengeRepository challengeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private RefreshTokenService refreshTokenService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private PasswordResetService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(
                challengeRepository, userRepository, passwordEncoder, emailService, refreshTokenService);
        // @Value fields, which nothing populates outside a Spring context.
        ReflectionTestUtils.setField(service, "expiryMinutes", EXPIRY_MINUTES);
        ReflectionTestUtils.setField(service, "maxAttempts", MAX_ATTEMPTS);
        ReflectionTestUtils.setField(service, "resendCooldownSeconds", RESEND_COOLDOWN_SECONDS);

        user = User.builder()
                .id(7L)
                .email(EMAIL)
                .passwordHash(passwordEncoder.encode("OldPass1!"))
                .fullName("Forgetful Person")
                .phone("9800000000")
                .role(Role.CUSTOMER)
                .build();

        lenient().when(challengeRepository.save(any(PasswordResetChallenge.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    /**
     * Runs a reset request and hands back both halves the later steps need: the row the
     * service built and the code that went out with it.
     */
    private Started start() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        service.request(EMAIL);

        ArgumentCaptor<PasswordResetChallenge> saved =
                ArgumentCaptor.forClass(PasswordResetChallenge.class);
        verify(challengeRepository, atLeastOnce()).save(saved.capture());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> model = ArgumentCaptor.forClass(Map.class);
        verify(emailService, atLeastOnce())
                .sendTemplate(eq(EMAIL), anyString(), eq("email/otp"), model.capture());

        PasswordResetChallenge challenge = saved.getValue();
        // Lenient because the tests that only inspect what request() produced never look the
        // challenge back up.
        lenient().when(challengeRepository.findByChallengeToken(challenge.getChallengeToken()))
                .thenReturn(Optional.of(challenge));
        return new Started(challenge, (String) model.getValue().get("code"));
    }

    private record Started(PasswordResetChallenge challenge, String code) {
    }

    @Test
    void request_emailsSixDigitsAndStoresOnlyTheirHash() {
        Started started = start();

        assertThat(started.code()).matches("\\d{6}");
        assertThat(started.challenge().getOtpHash()).isNotEqualTo(started.code());
        assertThat(passwordEncoder.matches(started.code(), started.challenge().getOtpHash())).isTrue();
        assertThat(started.challenge().getChallengeToken()).isNotBlank();
        assertThat(started.challenge().getUserId()).isEqualTo(7L);
        assertThat(started.challenge().getVerifiedAt()).isNull();
        assertThat(started.challenge().getExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    void request_unknownAddress_saysSoAndSendsNothing() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.request("nobody@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(emailService, never()).sendTemplate(anyString(), anyString(), anyString(), any());
    }

    @Test
    void request_insideTheCooldownOfAnEarlierOne_isRefused() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        PasswordResetChallenge inFlight = PasswordResetChallenge.builder()
                .lastSentAt(LocalDateTime.now())
                .build();
        when(challengeRepository.findByEmail(EMAIL)).thenReturn(Optional.of(inFlight));

        // Nothing else in the application rate-limits anything, so without this an endpoint
        // that takes an address and mails it is an amplifier for anyone who knows one.
        assertThatThrownBy(() -> service.request(EMAIL))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("wait");
        verify(challengeRepository, never()).deleteByEmail(anyString());
        verify(emailService, never()).sendTemplate(anyString(), anyString(), anyString(), any());
    }

    @Test
    void request_undeliverableEmail_leavesNothingBehind() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        RuntimeException undeliverable = new RuntimeException("smtp down");
        org.mockito.Mockito.doThrow(undeliverable)
                .when(emailService).sendTemplate(anyString(), anyString(), anyString(), any());

        // The failure has to reach the caller rather than leave them told to check an inbox
        // that will never receive anything.
        assertThatThrownBy(() -> service.request(EMAIL)).isSameAs(undeliverable);
    }

    @Test
    void verify_correctCode_marksTheRowAndGivesAFullWindowToChooseAPassword() {
        Started started = start();
        // Nine minutes into a ten-minute code: the remaining minute is a limit on guessing,
        // not on typing a password afterwards.
        started.challenge().setExpiresAt(LocalDateTime.now().plusMinutes(1));

        service.verify(started.challenge().getChallengeToken(), started.code());

        assertThat(started.challenge().isVerified()).isTrue();
        assertThat(started.challenge().getExpiresAt())
                .isAfter(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES - 1));
        // The caller still has a password to choose; the row has to survive to authorise it.
        verify(challengeRepository, never()).delete(started.challenge());
    }

    @Test
    void verify_wrongCode_countsTheAttemptAndSaysHowManyAreLeft() {
        Started started = start();

        assertThatThrownBy(() -> service.verify(started.challenge().getChallengeToken(), "000000"))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining(String.valueOf(MAX_ATTEMPTS - 1));
        assertThat(started.challenge().getAttempts()).isEqualTo(1);
    }

    @Test
    void verify_atTheAttemptCap_burnsTheChallenge() {
        Started started = start();

        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            assertThatThrownBy(() -> service.verify(started.challenge().getChallengeToken(), "000000"))
                    .isInstanceOf(OtpException.class);
        }

        // Destroyed rather than left to be ground down at leisure.
        verify(challengeRepository).delete(started.challenge());
    }

    @Test
    void verify_expiredChallenge_isRejectedEvenWithTheRightCode() {
        Started started = start();
        started.challenge().setExpiresAt(LocalDateTime.now().minusSeconds(1));

        assertThatThrownBy(() -> service.verify(started.challenge().getChallengeToken(), started.code()))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("expired");
        verify(challengeRepository).delete(started.challenge());
    }

    @Test
    void verify_unknownChallenge_readsLikeAWrongCode() {
        when(challengeRepository.findByChallengeToken("no-such-token")).thenReturn(Optional.empty());

        // Not "no such reset": that would turn the endpoint into a way of finding out whether
        // a given address has one in flight.
        assertThatThrownBy(() -> service.verify("no-such-token", "123456"))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("not correct");
    }

    @Test
    void reset_setsThePasswordClearsTheLockoutAndEndsEverySession() {
        Started started = start();
        service.verify(started.challenge().getChallengeToken(), started.code());
        user.setFailedLoginAttempts(4);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        service.reset(started.challenge().getChallengeToken(), "BrandNew1!");

        assertThat(passwordEncoder.matches("BrandNew1!", user.getPasswordHash())).isTrue();
        // Being locked out is the likeliest reason anyone is here at all; leaving the lock in
        // place would mean the password they just chose does not work either.
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
        verify(refreshTokenService).revokeAllForUser(7L);
        verify(challengeRepository).delete(started.challenge());
    }

    @Test
    void reset_givesAGoogleOnlyAccountItsFirstPassword() {
        user.setPasswordHash(null);
        Started started = start();
        service.verify(started.challenge().getChallengeToken(), started.code());
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        service.reset(started.challenge().getChallengeToken(), "BrandNew1!");

        // Nothing about the account was Google-specific except the missing hash, so a reset
        // is the ordinary path - and the only way in for someone who forgot they used Google.
        assertThat(passwordEncoder.matches("BrandNew1!", user.getPasswordHash())).isTrue();
    }

    @Test
    void reset_withoutTheCodeStep_isRefused() {
        Started started = start();

        // Holding the token proves only that this browser started the reset, not that anyone
        // read the mailbox.
        assertThatThrownBy(() -> service.reset(started.challenge().getChallengeToken(), "BrandNew1!"))
                .isInstanceOf(OtpException.class);
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    void resend_insideTheCooldown_isRefused() {
        Started started = start();

        assertThatThrownBy(() -> service.resend(started.challenge().getChallengeToken()))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("wait");
    }

    @Test
    void resend_afterTheCooldown_replacesTheCodeAndRevokesAnyProofAlreadyGiven() {
        Started started = start();
        service.verify(started.challenge().getChallengeToken(), started.code());
        started.challenge().setLastSentAt(LocalDateTime.now().minusSeconds(RESEND_COOLDOWN_SECONDS + 1));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        service.resend(started.challenge().getChallengeToken());

        // A new code is a new puzzle, not another go at the old one - and the proof the old
        // one bought does not carry over.
        assertThat(passwordEncoder.matches(started.code(), started.challenge().getOtpHash())).isFalse();
        assertThat(started.challenge().getAttempts()).isZero();
        assertThat(started.challenge().isVerified()).isFalse();
    }
}
