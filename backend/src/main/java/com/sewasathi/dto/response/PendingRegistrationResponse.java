package com.sewasathi.dto.response;

import com.sewasathi.service.RegistrationOtpService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * What registration answers with now: not an account, but a challenge. The account is only
 * created once the code emailed to {@link #email} is posted back with {@link #challengeToken}.
 *
 * <p>The two countdowns are sent as durations rather than timestamps so the client does not
 * have to trust its own clock against the server's to render them.
 */
@Getter
@Builder
@AllArgsConstructor
public class PendingRegistrationResponse {

    /** Opaque handle for the pending signup; quoted when submitting the code. */
    private String challengeToken;

    /** Where the code was sent, echoed back so the client can name it on the OTP screen. */
    private String email;

    /** How long the code stays good for. */
    private long expiresInSeconds;

    /** How long before another code can be requested. */
    private long resendAvailableInSeconds;

    public static PendingRegistrationResponse from(RegistrationOtpService.Challenge challenge) {
        return PendingRegistrationResponse.builder()
                .challengeToken(challenge.challengeToken())
                .email(challenge.email())
                .expiresInSeconds(challenge.expiresInSeconds())
                .resendAvailableInSeconds(challenge.resendAvailableInSeconds())
                .build();
    }
}
