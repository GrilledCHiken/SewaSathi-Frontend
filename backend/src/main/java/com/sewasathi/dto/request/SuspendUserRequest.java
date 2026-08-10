package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The reason an administrator is suspending an account. Mandatory, because it is shown to the
 * account holder verbatim and is all they have to act on.
 */
@Getter
@Setter
public class SuspendUserRequest {

    @NotBlank(message = "{validation.suspensionReason.required}")
    @Size(max = 500, message = "{validation.suspensionReason.tooLong}")
    private String reason;
}
