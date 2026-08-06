package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Starts a password reset. The address is the whole request: whoever is asking has, by
 * definition, lost the credential that would otherwise identify them, so the only thing that
 * can be proved is control of the mailbox.
 */
@Getter
@Setter
public class ForgotPasswordRequest {

    @NotBlank(message = "{validation.email.required}")
    @Email(message = "{validation.email.invalid}")
    @Size(max = 255, message = "{validation.email.tooLong}")
    private String email;
}
