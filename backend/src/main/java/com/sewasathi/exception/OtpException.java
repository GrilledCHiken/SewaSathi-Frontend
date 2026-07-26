package com.sewasathi.exception;

/**
 * A one-time-code challenge could not be completed - wrong code, expired, already used, or
 * too many attempts.
 *
 * <p>The message is deliberately uniform across those cases so a caller cannot probe which
 * challenge tokens are live.
 */
public class OtpException extends RuntimeException {
    public OtpException(String message) {
        super(message);
    }

    public static OtpException invalid() {
        return new OtpException("That code is incorrect or has expired. Request a new one.");
    }
}
