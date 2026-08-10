package com.sewasathi.dto.response;

import com.sewasathi.service.PasswordResetService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * A password reset in progress. The countdowns are durations rather than timestamps, so the
 * client need not trust its own clock against the server's.
 */
@Getter
@Builder
@AllArgsConstructor
public class PasswordResetChallengeResponse {

    /** Opaque handle for the reset; quoted when submitting the code and the new password. */
    private String challengeToken;

    /** Where the code was sent, echoed back so the client can name it on the code screen. */
    private String email;

    /** How long the code stays good for. */
    private long expiresInSeconds;

    /** How long before another code can be requested. */
    private long resendAvailableInSeconds;

    public static PasswordResetChallengeResponse from(PasswordResetService.Challenge challenge) {
        return PasswordResetChallengeResponse.builder()
                .challengeToken(challenge.challengeToken())
                .email(challenge.email())
                .expiresInSeconds(challenge.expiresInSeconds())
                .resendAvailableInSeconds(challenge.resendAvailableInSeconds())
                .build();
    }
}
