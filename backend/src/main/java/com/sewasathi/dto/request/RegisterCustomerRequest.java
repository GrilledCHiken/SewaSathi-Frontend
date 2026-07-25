package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterCustomerRequest {

    @NotBlank
    @Size(max = 150, message = "Full name cannot be longer than 150 characters")
    private String fullName;

    @NotBlank
    @Email
    @Size(max = 255, message = "Email cannot be longer than 255 characters")
    private String email;

    @NotBlank
    @Pattern(regexp = "^9[78]\\d{8}$",
            message = "Enter a valid 10-digit mobile number starting with 97 or 98")
    private String phone;

    // max = 72 is the BCrypt input limit - anything beyond it is silently truncated.
    @NotBlank
    @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "Password must include an uppercase letter, a lowercase letter, a number, and a special character")
    private String password;
}
