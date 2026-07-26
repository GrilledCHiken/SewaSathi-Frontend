package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Takes the address explicitly because this endpoint must be reachable without a token:
 * an unverified account cannot sign in, so it could never authenticate to ask for a new link.
 */
@Getter
@Setter
public class ResendVerificationRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    private String email;
}
