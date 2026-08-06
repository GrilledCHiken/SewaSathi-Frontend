package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * A "Sign in with Google" attempt.
 *
 * <p>The same request serves both halves of signing up. Posted with {@code credential} alone it
 * either signs an existing account in or answers 202 asking for a phone number; posted again
 * with {@code phone} it creates the account. The client simply re-sends the credential it
 * already holds rather than us minting a ticket of our own: the token is good for about an hour
 * and is bound to our client ID by the audience check, so a second short-lived handle would add
 * a table to expire and nothing else.
 */
@Getter
@Setter
public class GoogleSignInRequest {

    /** The ID token from Google Identity Services - its {@code credential} field verbatim. */
    @NotBlank(message = "{validation.googleCredential.required}")
    private String credential;

    /**
     * Only needed when the account does not exist yet. Google never supplies a phone number and
     * {@code users.phone} is how a worker reaches a customer, so it is collected rather than
     * left blank.
     */
    @Pattern(regexp = "^9[78]\\d{8}$", message = "{validation.phone.invalid}")
    private String phone;
}
