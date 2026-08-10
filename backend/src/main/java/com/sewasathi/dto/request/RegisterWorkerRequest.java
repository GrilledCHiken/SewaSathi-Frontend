package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RegisterWorkerRequest {

    @NotBlank(message = "{validation.fullName.required}")
    @Size(max = 150, message = "{validation.fullName.tooLong}")
    private String fullName;

    @NotBlank(message = "{validation.email.required}")
    @Email(message = "{validation.email.invalid}")
    @Size(max = 255, message = "{validation.email.tooLong}")
    private String email;

    @NotBlank(message = "{validation.phone.required}")
    @Pattern(regexp = "^9[78]\\d{8}$", message = "{validation.phone.invalid}")
    private String phone;

    // max = 72 is the BCrypt input limit - anything beyond it is silently truncated.
    @NotBlank(message = "{validation.password.required}")
    @Size(min = 8, max = 72, message = "{validation.password.length}")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "{validation.password.weak}")
    private String password;

    // Optional worker-profile fields, backfilled later via the profile-edit page.
    private String skills;
    private BigDecimal hourlyRate;
    private String location;
    private String bio;
}
