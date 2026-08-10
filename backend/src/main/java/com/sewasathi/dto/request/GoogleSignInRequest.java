package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * A "Sign in with Google" attempt. Posted with {@code credential} alone it either signs an
 * existing account in or answers 202 asking for a phone number; posted again with {@code phone}
 * it creates the account. The client re-sends the same credential, which stays valid for about
 * an hour and is bound to our client ID by the audience check.
 */
@Getter
@Setter
public class GoogleSignInRequest {

    /** The ID token from Google Identity Services - its {@code credential} field verbatim. */
    @NotBlank(message = "{validation.googleCredential.required}")
    private String credential;

    /**
     * Only needed when the account does not exist yet. Google supplies no phone number, and
     * {@code users.phone} is how a worker reaches a customer.
     */
    @Pattern(regexp = "^9[78]\\d{8}$", message = "{validation.phone.invalid}")
    private String phone;
}
