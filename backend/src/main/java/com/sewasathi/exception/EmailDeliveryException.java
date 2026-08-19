package com.sewasathi.exception;

/**
 * The mail server would not take a message. Distinct from the caller's own errors: nothing
 * the user typed caused it and retrying the same request may well work, which is why
 * {@link GlobalExceptionHandler} answers it with 502 rather than 400 or 500.
 */
public class EmailDeliveryException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public EmailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
