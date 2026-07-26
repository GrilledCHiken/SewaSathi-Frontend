package com.sewasathi.controller;

import com.sewasathi.dto.request.ForgotPasswordRequest;
import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.ResendVerificationRequest;
import com.sewasathi.dto.request.ResetPasswordRequest;
import com.sewasathi.dto.request.VerifyEmailRequest;
import com.sewasathi.dto.request.VerifyOtpRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.AuthService;
import com.sewasathi.service.DeviceContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/customer")
    public ResponseEntity<AuthResponse> registerCustomer(@Valid @RequestBody RegisterCustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerCustomer(request));
    }

    @PostMapping("/register/worker")
    public ResponseEntity<AuthResponse> registerWorker(@Valid @RequestBody RegisterWorkerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerWorker(request));
    }

    /**
     * May return a token, or a challenge that must be answered via {@link #verifyOtp}. The
     * servlet request is read here only to derive the device fingerprint, keeping servlet
     * types out of the service layer.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, DeviceContext.from(httpRequest)));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request.getChallengeToken(), request.getCode()));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<Void> enableTwoFactor(@AuthenticationPrincipal UserPrincipal principal) {
        authService.setTwoFactor(principal.getUsername(), true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<Void> disableTwoFactor(@AuthenticationPrincipal UserPrincipal principal) {
        authService.setTwoFactor(principal.getUsername(), false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.getToken());
        return ResponseEntity.ok().build();
    }

    /**
     * Public: an unverified account cannot sign in, so requiring a token here would leave
     * anyone whose link expired permanently locked out. Always answers 200, whether or not
     * the address has an account, so it cannot be used to enumerate users.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request.getEmail());
        return ResponseEntity.ok().build();
    }
}
