package com.sewasathi.controller;

import com.sewasathi.dto.request.ForgotPasswordRequest;
import com.sewasathi.dto.request.GoogleSignInRequest;
import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RefreshTokenRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
import com.sewasathi.dto.request.ResendOtpRequest;
import com.sewasathi.dto.request.ResetPasswordRequest;
import com.sewasathi.dto.request.VerifyPasswordResetRequest;
import com.sewasathi.dto.request.VerifyRegistrationRequest;
import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.dto.response.PasswordResetChallengeResponse;
import com.sewasathi.dto.response.PendingRegistrationResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.AuthService;
import com.sewasathi.service.DeviceContext;
import com.sewasathi.service.GoogleSignInOutcome;
import com.sewasathi.service.PasswordResetService;
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

    private final PasswordResetService passwordResetService;


    @PostMapping("/register/customer")
    public ResponseEntity<PendingRegistrationResponse> registerCustomer(
            @Valid @RequestBody RegisterCustomerRequest request) {
        return ResponseEntity.accepted().body(authService.registerCustomer(request));
    }

    @PostMapping("/register/worker")
    public ResponseEntity<PendingRegistrationResponse> registerWorker(
            @Valid @RequestBody RegisterWorkerRequest request) {
        return ResponseEntity.accepted().body(authService.registerWorker(request));
    }

   
    @PostMapping("/register/verify")
    public ResponseEntity<AuthResponse> verifyRegistration(
            @Valid @RequestBody VerifyRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.completeRegistration(request));
    }

    /** Issues a fresh code for a signup already in flight, subject to a cooldown. */
    @PostMapping("/register/resend")
    public ResponseEntity<PendingRegistrationResponse> resendRegistrationOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        return ResponseEntity.ok(authService.resendRegistrationOtp(request));
    }

    @PostMapping("/google")
    public ResponseEntity<?> google(@Valid @RequestBody GoogleSignInRequest request,
                                    HttpServletRequest httpRequest) {
        GoogleSignInOutcome outcome =
                authService.loginWithGoogle(request, DeviceContext.from(httpRequest));

        return switch (outcome) {
            case GoogleSignInOutcome.SignedIn signedIn -> ResponseEntity.ok(signedIn.response());
            case GoogleSignInOutcome.Created created ->
                    ResponseEntity.status(HttpStatus.CREATED).body(created.response());
            case GoogleSignInOutcome.NeedsProfile needsProfile ->
                    ResponseEntity.accepted().body(needsProfile.response());
        };
    }

    /**
     * The servlet request is read here only to derive the device label recorded against the
     * refresh token, keeping servlet types out of the service layer.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, DeviceContext.from(httpRequest)));
    }

   
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request,
                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(
                request.getRefreshToken(), DeviceContext.from(httpRequest)));
    }

    
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutEverywhere(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logoutEverywhere(principal.getUsername());
        return ResponseEntity.noContent().build();
    }

   
    @PostMapping("/password/forgot")
    public ResponseEntity<PasswordResetChallengeResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.accepted()
                .body(PasswordResetChallengeResponse.from(passwordResetService.request(request.getEmail())));
    }

    @PostMapping("/password/resend")
    public ResponseEntity<PasswordResetChallengeResponse> resendPasswordResetOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        return ResponseEntity.ok(PasswordResetChallengeResponse.from(
                passwordResetService.resend(request.getChallengeToken())));
    }

    @PostMapping("/password/verify")
    public ResponseEntity<PasswordResetChallengeResponse> verifyPasswordReset(
            @Valid @RequestBody VerifyPasswordResetRequest request) {
        return ResponseEntity.ok(PasswordResetChallengeResponse.from(
                passwordResetService.verify(request.getChallengeToken(), request.getCode())));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.reset(request.getChallengeToken(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}
