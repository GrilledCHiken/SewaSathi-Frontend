package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EsewaVerifyRequest {

    /** The Base64 blob eSewa put in the {@code data} query parameter of our success URL. */
    @NotBlank
    private String data;
}
