package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The last step of a password reset. There is no current password to quote, so the
 * already-verified challenge token is the credential. Rules match {@link ChangePasswordRequest}.
 */
@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "{validation.challengeToken.required}")
    private String challengeToken;

    // max = 72 is the BCrypt input limit - anything beyond it is silently truncated.
    @NotBlank(message = "{validation.password.required}")
    @Size(min = 8, max = 72, message = "{validation.password.length}")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "{validation.password.weak}")
    private String newPassword;
}
