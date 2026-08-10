package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Asks for a new verification code on an in-flight signup. The challenge token is all that is
 * needed - the address is on the pending row, so a caller cannot redirect someone else's code.
 */
@Getter
@Setter
public class ResendOtpRequest {

    @NotBlank(message = "{validation.challengeToken.required}")
    private String challengeToken;
}
