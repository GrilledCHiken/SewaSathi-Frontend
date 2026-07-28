package com.sewasathi.controller;

import com.sewasathi.dto.request.LoginRequest;
import com.sewasathi.dto.request.RefreshTokenRequest;
import com.sewasathi.dto.request.RegisterCustomerRequest;
import com.sewasathi.dto.request.RegisterWorkerRequest;
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
}
