package com.sewasathi.controller;

import com.sewasathi.dto.request.ForgotPasswordRequest;
import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.ResetPasswordRequest;
import com.sewasathi.dto.request.VerifyEmailRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.AuthService;
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

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
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

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@AuthenticationPrincipal UserPrincipal principal) {
        authService.resendVerification(principal.getUsername());
        return ResponseEntity.ok().build();
    }
}
