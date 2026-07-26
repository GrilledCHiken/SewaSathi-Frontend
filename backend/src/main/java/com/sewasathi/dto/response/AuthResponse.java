package com.sewasathi.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * The result of an authentication attempt, which is no longer always "here is your token".
 * Three outcomes share this shape:
 *
 * <ul>
 *   <li><b>Authenticated</b> - {@code token} and {@code user} are set.</li>
 *   <li><b>Registered, pending verification</b> - no token; the account cannot sign in until
 *       the emailed link is followed.</li>
 *   <li><b>Challenge required</b> - no token; the client must post the emailed code back
 *       with {@code challengeToken} to finish signing in.</li>
 * </ul>
 *
 * Absent fields are omitted from the JSON rather than sent as nulls, so the client can test
 * for their presence.
 */
@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    private String token;
    private UserResponse user;

    /** Set when the account exists but its email address has not been confirmed. */
    private Boolean requiresVerification;

    /** Set when a one-time code must be submitted before a token is issued. */
    private Boolean challengeRequired;

    /** Opaque handle identifying the pending challenge; paired with the emailed code. */
    private String challengeToken;

    /** Why the challenge was raised, so the client can word the prompt appropriately. */
    private String challengeReason;

    public static AuthResponse authenticated(String token, UserResponse user) {
        return AuthResponse.builder().token(token).user(user).build();
    }

    public static AuthResponse pendingVerification(UserResponse user) {
        return AuthResponse.builder().user(user).requiresVerification(true).build();
    }

    public static AuthResponse challenge(String challengeToken, String reason) {
        return AuthResponse.builder()
                .challengeRequired(true)
                .challengeToken(challengeToken)
                .challengeReason(reason)
                .build();
    }
}
