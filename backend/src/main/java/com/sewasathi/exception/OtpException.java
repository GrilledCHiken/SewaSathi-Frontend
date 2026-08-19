package com.sewasathi.exception;

/**
 * The verification code standing between a submitted signup and a real account was not
 * accepted. Answered with 400 by {@link GlobalExceptionHandler}.
 *
 * <p>The messages are deliberately vague about <em>which</em> code or challenge was wrong -
 * an unknown token and a wrong digit read the same from outside - so the endpoint cannot be
 * used to work out whether a given signup is in flight.
 */
public class OtpException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private OtpException(String message) {
        super(message);
    }

    /** Wrong code, or a challenge token that does not exist. */
    public static OtpException invalid(int attemptsLeft) {
        return new OtpException(attemptsLeft > 0
                ? "That code is not correct. " + attemptsLeft + " attempt(s) left."
                : "That code is not correct.");
    }

    public static OtpException expired() {
        return new OtpException("That code has expired. Start the signup again to get a new one.");
    }

    public static OtpException tooManyAttempts() {
        return new OtpException("Too many incorrect codes. Start the signup again to get a new one.");
    }

    public static OtpException resendTooSoon(long secondsLeft) {
        return new OtpException("Please wait " + secondsLeft + " second(s) before asking for another code.");
    }
}
