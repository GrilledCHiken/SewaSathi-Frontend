package com.sewasathi.dto.response;

import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class PaymentResponse {
    private Long id;
    private String transactionUuid;
    private PaymentProvider provider;
    private PaymentStatus status;
    private BigDecimal amount;
    private BigDecimal taskTotal;
    private String refId;
    private LocalDateTime createdAt;
    private TaskResponse task;

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getTransactionUuid(),
                payment.getProvider(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getTaskTotal(),
                payment.getRefId(),
                payment.getCreatedAt(),
                TaskResponse.from(payment.getTask())
        );
    }
}
