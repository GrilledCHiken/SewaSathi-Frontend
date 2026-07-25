package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RegisterWorkerRequest {

    @NotBlank
    private String fullName;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String phone;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    // Optional worker-profile fields - the signup form doesn't collect these yet,
    // they're backfilled later via a worker profile-edit page.
    private String skills;
    private BigDecimal hourlyRate;
    private String location;
    private String bio;
}
