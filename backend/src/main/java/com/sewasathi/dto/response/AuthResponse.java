package com.sewasathi.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * The result of an authentication attempt. Two outcomes share this shape:
 *
 * <ul>
 *   <li><b>Authenticated</b> - {@code token}, {@code refreshToken} and {@code user} are set.</li>
 *   <li><b>Registered</b> - {@code user} only; the client sends it to the sign-in page.</li>
 * </ul>
 *
 * Absent fields are omitted from the JSON rather than sent as nulls.
 */
@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    /** Short-lived bearer token for API calls. */
    private String token;

    /**
     * Long-lived credential used to obtain a new {@code token} once it expires
     * (requirement #2). Absent from every response that does not authenticate the caller.
     */
    private String refreshToken;

    private UserResponse user;

    public static AuthResponse authenticated(String token, String refreshToken, UserResponse user) {
        return AuthResponse.builder().token(token).refreshToken(refreshToken).user(user).build();
    }

    /** A renewed pair from {@code /api/auth/refresh}; the user object is unchanged. */
    public static AuthResponse refreshed(String token, String refreshToken, UserResponse user) {
        return authenticated(token, refreshToken, user);
    }

    /** A newly created account. No token: the client redirects to the sign-in page. */
    public static AuthResponse registered(UserResponse user) {
        return AuthResponse.builder().user(user).build();
    }
}
