package com.sewasathi.exception;

/**
 * A "Sign in with Google" assertion that could not be trusted: a bad signature, the wrong
 * audience or issuer, an expired token, or a Google account whose own email address is
 * unverified. Answered with 401 by {@link GlobalExceptionHandler}.
 *
 * <p>The messages stay vague about which check failed. A caller holding a token we reject has
 * no legitimate use for the detail, and spelling it out would help someone work out what to
 * forge next.
 */
public class GoogleAuthException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public GoogleAuthException(String message) {
        super(message);
    }

    public GoogleAuthException(String message, Throwable cause) {
        super(message, cause);
    }
}
