package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class KhaltiVerifyRequest {

    /** The {@code pidx} Khalti put in the query string of our return URL. */
    @NotBlank
    private String pidx;
}
