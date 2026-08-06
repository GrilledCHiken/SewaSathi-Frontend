package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The reason an administrator is suspending an account. Mandatory: the text is emailed to
 * the account holder verbatim and repeated at their next sign-in attempt, so a suspension
 * without one would leave them locked out with nothing to act on.
 */
@Getter
@Setter
public class SuspendUserRequest {

    @NotBlank(message = "{validation.suspensionReason.required}")
    @Size(max = 500, message = "{validation.suspensionReason.tooLong}")
    private String reason;
}
