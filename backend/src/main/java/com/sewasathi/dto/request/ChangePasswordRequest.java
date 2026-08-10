package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * A password change from inside the account. The current password is required even though the
 * caller holds a valid access token: a token left on a shared machine would otherwise be
 * enough to lock the real owner out.
 */
@Getter
@Setter
public class ChangePasswordRequest {

    @NotBlank(message = "{validation.currentPassword.required}")
    private String currentPassword;

    // max = 72 is the BCrypt input limit - anything beyond it is silently truncated.
    @NotBlank(message = "{validation.password.required}")
    @Size(min = 8, max = 72, message = "{validation.password.length}")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "{validation.password.weak}")
    private String newPassword;
}
