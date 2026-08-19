package com.sewasathi.service;

import com.sewasathi.entity.PendingRegistration;
import com.sewasathi.entity.Role;
import com.sewasathi.exception.OtpException;
import com.sewasathi.repository.PendingRegistrationRepository;
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
class RegistrationOtpServiceTest {

    private static final int MAX_ATTEMPTS = 5;
    private static final int EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    @Mock
    private PendingRegistrationRepository pendingRegistrationRepository;

    @Mock
    private EmailService emailService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private RegistrationOtpService service;

    @BeforeEach
    void setUp() {
        service = new RegistrationOtpService(pendingRegistrationRepository, passwordEncoder, emailService);
        // @Value fields, which nothing populates outside a Spring context.
        ReflectionTestUtils.setField(service, "expiryMinutes", EXPIRY_MINUTES);
        ReflectionTestUtils.setField(service, "maxAttempts", MAX_ATTEMPTS);
        ReflectionTestUtils.setField(service, "resendCooldownSeconds", RESEND_COOLDOWN_SECONDS);
        lenient().when(pendingRegistrationRepository.save(any(PendingRegistration.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private PendingRegistration draft() {
        return PendingRegistration.builder()
                .email("signup@example.com")
                .passwordHash(passwordEncoder.encode("SignupPass1!"))
                .fullName("Signup Person")
                .phone("9800000000")
                .role(Role.CUSTOMER)
                .build();
    }

    @SuppressWarnings("unchecked")
    private String issueAndReadCode(PendingRegistration draft) {
        service.issue(draft);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(emailService, atLeastOnce())
                .sendTemplate(eq(draft.getEmail()), anyString(), eq("email/otp"), captor.capture());
        return (String) captor.getValue().get("code");
    }

    @Test
    void issue_emailsSixDigitsAndStoresOnlyTheirHash() {
        PendingRegistration draft = draft();

        String code = issueAndReadCode(draft);

        assertThat(code).matches("\\d{6}");
        assertThat(draft.getOtpHash()).isNotEqualTo(code);
        assertThat(passwordEncoder.matches(code, draft.getOtpHash())).isTrue();
        assertThat(draft.getChallengeToken()).isNotBlank();
        assertThat(draft.getExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    void issue_clearsAnyEarlierAttemptOnTheSameAddress() {
        PendingRegistration draft = draft();

        service.issue(draft);

        verify(pendingRegistrationRepository).deleteByEmail("signup@example.com");
    }

    @Test
    void issue_undeliverableEmail_leavesNothingBehind() {
        PendingRegistration draft = draft();
        RuntimeException undeliverable = new RuntimeException("smtp down");
        org.mockito.Mockito.doThrow(undeliverable)
                .when(emailService).sendTemplate(anyString(), anyString(), anyString(), any());

        assertThatThrownBy(() -> service.issue(draft)).isSameAs(undeliverable);
    }

    @Test
    void verify_correctCode_returnsTheSignupWithoutSpendingIt() {
        PendingRegistration draft = draft();
        String code = issueAndReadCode(draft);
        when(pendingRegistrationRepository.findByChallengeToken(draft.getChallengeToken()))
                .thenReturn(Optional.of(draft));

        PendingRegistration verified = service.verify(draft.getChallengeToken(), code);

        assertThat(verified).isSameAs(draft);
        verify(pendingRegistrationRepository, never()).delete(draft);
    }

    @Test
    void verify_wrongCode_countsTheAttemptAndSaysHowManyAreLeft() {
        PendingRegistration draft = draft();
        issueAndReadCode(draft);
        when(pendingRegistrationRepository.findByChallengeToken(draft.getChallengeToken()))
                .thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.verify(draft.getChallengeToken(), "000000"))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining(String.valueOf(MAX_ATTEMPTS - 1));
        assertThat(draft.getAttempts()).isEqualTo(1);
    }

    @Test
    void verify_atTheAttemptCap_burnsTheChallenge() {
        PendingRegistration draft = draft();
        issueAndReadCode(draft);
        when(pendingRegistrationRepository.findByChallengeToken(draft.getChallengeToken()))
                .thenReturn(Optional.of(draft));

        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            assertThatThrownBy(() -> service.verify(draft.getChallengeToken(), "000000"))
                    .isInstanceOf(OtpException.class);
        }

        verify(pendingRegistrationRepository).delete(draft);
    }

    @Test
    void verify_expiredChallenge_isRejectedEvenWithTheRightCode() {
        PendingRegistration draft = draft();
        String code = issueAndReadCode(draft);
        draft.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(pendingRegistrationRepository.findByChallengeToken(draft.getChallengeToken()))
                .thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.verify(draft.getChallengeToken(), code))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("expired");
        verify(pendingRegistrationRepository).delete(draft);
    }

    @Test
    void verify_unknownChallenge_readsLikeAWrongCode() {
        when(pendingRegistrationRepository.findByChallengeToken("no-such-token"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verify("no-such-token", "123456"))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("not correct");
    }

    @Test
    void resend_insideTheCooldown_isRefused() {
        PendingRegistration draft = draft();
        issueAndReadCode(draft);
        when(pendingRegistrationRepository.findByChallengeToken(draft.getChallengeToken()))
                .thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> service.resend(draft.getChallengeToken()))
                .isInstanceOf(OtpException.class)
                .hasMessageContaining("wait");
    }

    @Test
    void resend_afterTheCooldown_replacesTheOldCode() {
        PendingRegistration draft = draft();
        String firstCode = issueAndReadCode(draft);
        draft.setAttempts(3);
        draft.setLastSentAt(LocalDateTime.now().minusSeconds(RESEND_COOLDOWN_SECONDS + 1));
        when(pendingRegistrationRepository.findByChallengeToken(draft.getChallengeToken()))
                .thenReturn(Optional.of(draft));

        service.resend(draft.getChallengeToken());

        assertThat(passwordEncoder.matches(firstCode, draft.getOtpHash())).isFalse();
        assertThat(draft.getAttempts()).isZero();
        assertThatThrownBy(() -> service.verify(draft.getChallengeToken(), firstCode))
                .isInstanceOf(OtpException.class);
    }
}
