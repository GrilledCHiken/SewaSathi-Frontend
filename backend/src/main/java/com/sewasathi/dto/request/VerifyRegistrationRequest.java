package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * The second half of signing up: the code from the verification email, quoted against the
 * challenge token the registration call handed back. If this is accepted, the account is
 * created - until then nothing exists in {@code users}.
 */
@Getter
@Setter
public class VerifyRegistrationRequest {

    @NotBlank(message = "{validation.challengeToken.required}")
    private String challengeToken;

    @NotBlank(message = "{validation.otp.required}")
    @Pattern(regexp = "^\\d{6}$", message = "{validation.otp.invalid}")
    private String code;
}
