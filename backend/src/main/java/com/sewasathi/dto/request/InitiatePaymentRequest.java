package com.sewasathi.dto.request;

import com.sewasathi.entity.PaymentProvider;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InitiatePaymentRequest {

    @NotNull
    private Long taskId;

    @NotNull
    private PaymentProvider provider;
}
