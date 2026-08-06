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

    /**
     * The reset flow issues no session, so it does not belong behind {@code AuthService} -
     * routing it through would be four pure passthroughs. {@code UserProfileService} already
     * sets the precedent for a password being written outside {@code AuthService}.
     */
    private final PasswordResetService passwordResetService;

    /**
     * Starts a signup. Answers 202, not 201: nothing has been created yet. The response is a
     * challenge, and the account only comes into existence at {@link #verifyRegistration}
     * once the code emailed to the address has been sent back.
     */
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

    /**
     * Completes a signup by proving the email address. This is the call that creates the
     * account, which is why it - and not the register call above - answers 201.
     */
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

    /**
     * Signs in with a Google ID token obtained by the browser.
     *
     * <p>Three outcomes, three status codes: 200 for an existing account, 201 when this call
     * created one, and 202 when the identity checks out but we still need the phone number
     * Google does not supply - in which case nothing has been created and the client posts the
     * same credential back with a phone.
     */
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

    /**
     * Exchanges a refresh token for a fresh access/refresh pair (requirement #2).
     *
     * <p>Public by necessity: the access token it exists to replace has expired by the time
     * a client needs this, so it cannot be used to authenticate the call. The refresh token
     * in the body is the credential.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request,
                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(
                request.getRefreshToken(), DeviceContext.from(httpRequest)));
    }

    /**
     * Ends this session by revoking its refresh token. Always answers 204, even for a token
     * that was already invalid - a client signing out has nothing useful to do with an error,
     * and reporting one would leak whether the token was real.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }

    /** Ends every session for the signed-in account, on all devices. */
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutEverywhere(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logoutEverywhere(principal.getUsername());
        return ResponseEntity.noContent().build();
    }

    /**
     * Starts a password reset by emailing a code to the address given.
     *
     * <p>202, not 200: the password has not changed and will not until {@link #resetPassword},
     * two calls away. Public, necessarily - the caller has lost the only credential they had.
     */
    @PostMapping("/password/forgot")
    public ResponseEntity<PasswordResetChallengeResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.accepted()
                .body(PasswordResetChallengeResponse.from(passwordResetService.request(request.getEmail())));
    }

    /** Issues a fresh code for a reset already in flight, subject to the same cooldown. */
    @PostMapping("/password/resend")
    public ResponseEntity<PasswordResetChallengeResponse> resendPasswordResetOtp(
            @Valid @RequestBody ResendOtpRequest request) {
        return ResponseEntity.ok(PasswordResetChallengeResponse.from(
                passwordResetService.resend(request.getChallengeToken())));
    }

    /**
     * Proves control of the mailbox. Answers with the same challenge carrying a refreshed
     * expiry, which is the window the caller now has to choose a password.
     */
    @PostMapping("/password/verify")
    public ResponseEntity<PasswordResetChallengeResponse> verifyPasswordReset(
            @Valid @RequestBody VerifyPasswordResetRequest request) {
        return ResponseEntity.ok(PasswordResetChallengeResponse.from(
                passwordResetService.verify(request.getChallengeToken(), request.getCode())));
    }

    /**
     * Sets the new password and ends every existing session for the account.
     *
     * <p>204 with no session in the body on purpose: signing the caller straight in would
     * mean an emailed code alone had produced a login, and would undo the sign-out that is
     * half the point of resetting. They sign in with the password they just chose.
     */
    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.reset(request.getChallengeToken(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}
