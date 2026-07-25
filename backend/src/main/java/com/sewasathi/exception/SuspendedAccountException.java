package com.sewasathi.exception;

public class SuspendedAccountException extends RuntimeException {
    public SuspendedAccountException() {
        super("This account has been suspended. Contact support for details.");
    }
}
