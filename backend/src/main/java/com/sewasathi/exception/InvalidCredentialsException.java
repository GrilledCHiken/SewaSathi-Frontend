package com.sewasathi.exception;

public class InvalidCredentialsException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public InvalidCredentialsException() {
        super("Invalid email or password");
    }

    /**
     * For the one rejection worth explaining: an account that signs in with Google has no
     * password, so "invalid email or password" would send the user round in circles.
     */
    public InvalidCredentialsException(String message) {
        super(message);
    }
}
