package com.sewasathi.exception;

/**
 * Sign-in refused because the account's email address has never been confirmed.
 *
 * <p>Distinct from {@link InvalidCredentialsException} on purpose: the password was correct,
 * and the client needs to tell these apart to offer a "resend verification email" action
 * rather than a "wrong password" message.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException() {
        super("Please verify your email address before signing in. Check your inbox for the link.");
    }
}
