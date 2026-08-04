package com.sewasathi.controller;

import com.sewasathi.dto.request.CashPaymentRequest;
import com.sewasathi.dto.request.EsewaVerifyRequest;
import com.sewasathi.dto.request.InitiatePaymentRequest;
import com.sewasathi.dto.request.KhaltiVerifyRequest;
import com.sewasathi.dto.response.PaymentInitiationResponse;
import com.sewasathi.dto.response.PaymentResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/advance/initiate")
    public PaymentInitiationResponse initiateAdvance(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InitiatePaymentRequest request
    ) {
        return paymentService.initiateAdvance(
                principal.getUsername(), request.getTaskId(), request.getProvider());
    }

    /** The other leg: the rest of the price, once the worker has finished the job. */
    @PostMapping("/balance/initiate")
    public PaymentInitiationResponse initiateBalance(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InitiatePaymentRequest request
    ) {
        return paymentService.initiateBalance(
                principal.getUsername(), request.getTaskId(), request.getProvider());
    }

    /**
     * The same leg, paid in person. Separate from {@link #initiateBalance} because there is
     * no gateway to hand the browser to - this returns the pending claim itself, which the
     * worker then has to confirm before the job closes.
     */
    @PostMapping("/balance/cash")
    public PaymentResponse declareCashBalance(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CashPaymentRequest request
    ) {
        return paymentService.declareCashBalance(principal.getUsername(), request.getTaskId());
    }

    @PostMapping("/esewa/verify")
    public PaymentResponse verifyEsewa(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EsewaVerifyRequest request
    ) {
        return paymentService.completeEsewa(principal.getUsername(), request.getData());
    }

    @PostMapping("/khalti/verify")
    public PaymentResponse verifyKhalti(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody KhaltiVerifyRequest request
    ) {
        return paymentService.completeKhalti(principal.getUsername(), request.getPidx());
    }

    @PostMapping("/{transactionUuid}/fail")
    public PaymentResponse markFailed(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String transactionUuid
    ) {
        return paymentService.markFailed(principal.getUsername(), transactionUuid);
    }

    @GetMapping("/mine")
    public List<PaymentResponse> myPayments(@AuthenticationPrincipal UserPrincipal principal) {
        return paymentService.listMyPayments(principal.getUsername());
    }
}
