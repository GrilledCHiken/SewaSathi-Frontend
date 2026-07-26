package com.sewasathi.exception;

import com.sewasathi.dto.response.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(HttpStatus.CONFLICT.value(), ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(HttpStatus.UNAUTHORIZED.value(), ex.getMessage()));
    }

    @ExceptionHandler(SuspendedAccountException.class)
    public ResponseEntity<ErrorResponse> handleSuspendedAccount(SuspendedAccountException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(HttpStatus.FORBIDDEN.value(), ex.getMessage()));
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ErrorResponse> handleAccountLocked(AccountLockedException ex) {
        return ResponseEntity.status(HttpStatus.LOCKED)
                .body(ErrorResponse.of(HttpStatus.LOCKED.value(), ex.getMessage()));
    }

    /**
     * 403 rather than 401: the password was right, so this is not a credentials problem.
     * The client keys off this status to offer "resend verification email".
     */
    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<ErrorResponse> handleEmailNotVerified(EmailNotVerifiedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(HttpStatus.FORBIDDEN.value(), ex.getMessage()));
    }

    @ExceptionHandler(OtpException.class)
    public ResponseEntity<ErrorResponse> handleOtp(OtpException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(InvalidTokenException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(HttpStatus.NOT_FOUND.value(), ex.getMessage()));
    }

    @ExceptionHandler(InvalidOperationException.class)
    public ResponseEntity<ErrorResponse> handleInvalidOperation(InvalidOperationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Something went wrong"));
    }
}
