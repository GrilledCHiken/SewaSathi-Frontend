package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The account fields a signed-in user may change about themselves.
 *
 * <p>Email is deliberately absent: it is the login identifier and the unique key every
 * refresh token and file-access check resolves against, so changing it is not a profile
 * edit. Role and approval status are the admin's to set, never the account holder's.
 *
 * <p>Rules mirror {@link RegisterCustomerRequest} exactly - editing a profile cannot be a
 * way to store a name or number that signup would have rejected.
 */
@Getter
@Setter
public class UpdateProfileRequest {

    @NotBlank(message = "{validation.fullName.required}")
    @Size(max = 150, message = "{validation.fullName.tooLong}")
    private String fullName;

    @NotBlank(message = "{validation.phone.required}")
    @Pattern(regexp = "^9[78]\\d{8}$", message = "{validation.phone.invalid}")
    private String phone;
}
