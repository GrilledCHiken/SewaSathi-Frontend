package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Carries a refresh token in the request body rather than a header or a query string:
 * query strings end up in access logs and browser history, and this value is a credential.
 */
@Getter
@Setter
public class RefreshTokenRequest {

    @NotBlank(message = "{validation.refreshToken.required}")
    private String refreshToken;
}
