package com.sewasathi.controller;

import com.sewasathi.dto.response.PaymentResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The worker's answer to a cash claim: did the money actually arrive?
 *
 * <p>Sits under {@code /api/worker} rather than {@code /api/payments}, which SecurityConfig
 * restricts to {@code ROLE_CUSTOMER} and would refuse every worker. Same reasoning as
 * {@link WorkerEarningsController}. There is no worker id in the path - the service answers
 * only for tasks assigned to the caller.
 */
@RestController
@RequestMapping("/api/worker/payments")
@RequiredArgsConstructor
public class WorkerPaymentController {

    private final PaymentService paymentService;

    @PostMapping("/{taskId}/cash/confirm")
    public PaymentResponse confirmCash(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId
    ) {
        return paymentService.confirmCashReceipt(principal.getUsername(), taskId);
    }

    @PostMapping("/{taskId}/cash/reject")
    public PaymentResponse rejectCash(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long taskId
    ) {
        return paymentService.rejectCashReceipt(principal.getUsername(), taskId);
    }
}
