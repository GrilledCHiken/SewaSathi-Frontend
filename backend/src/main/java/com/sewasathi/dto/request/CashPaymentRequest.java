package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Declaring the closing payment was handed over in cash. No provider field: cash is the
 * provider, and there is no gateway to choose between.
 */
@Getter
@Setter
public class CashPaymentRequest {

    @NotNull
    private Long taskId;
}
