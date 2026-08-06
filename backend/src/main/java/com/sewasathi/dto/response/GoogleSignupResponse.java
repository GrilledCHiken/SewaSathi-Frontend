package com.sewasathi.dto.response;

import com.sewasathi.service.GoogleIdentity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * The answer when a verified Google identity has no account here yet: not a session, but a
 * request for the one thing Google cannot supply.
 *
 * <p>The name and picture are echoed back so the confirmation screen can show whose account is
 * about to be created - a real risk when the browser holds several Google logins and picked one
 * the user did not expect.
 */
@Getter
@Builder
@AllArgsConstructor
public class GoogleSignupResponse {

    /** Always true. Lets the client branch on the body without inspecting the status code. */
    private boolean profileCompletionRequired;

    private String email;
    private String fullName;
    private String avatarUrl;

    public static GoogleSignupResponse from(GoogleIdentity identity) {
        return GoogleSignupResponse.builder()
                .profileCompletionRequired(true)
                .email(identity.email())
                .fullName(identity.fullName())
                .avatarUrl(identity.avatarUrl())
                .build();
    }
}
