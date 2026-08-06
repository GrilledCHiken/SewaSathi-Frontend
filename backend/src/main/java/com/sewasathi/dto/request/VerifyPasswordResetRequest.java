package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * The middle step of a password reset: the code from the email, quoted against the challenge
 * token the forgot-password call handed back. Accepting it changes no password - it only
 * unlocks {@link ResetPasswordRequest}.
 */
@Getter
@Setter
public class VerifyPasswordResetRequest {

    @NotBlank(message = "{validation.challengeToken.required}")
    private String challengeToken;

    @NotBlank(message = "{validation.otp.required}")
    @Pattern(regexp = "^\\d{6}$", message = "{validation.otp.invalid}")
    private String code;
}
