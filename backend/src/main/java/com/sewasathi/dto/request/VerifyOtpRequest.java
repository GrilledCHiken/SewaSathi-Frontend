package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyOtpRequest {

    @NotBlank(message = "Challenge token is required")
    private String challengeToken;

    @NotBlank(message = "Code is required")
    @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code from your email")
    private String code;
}
