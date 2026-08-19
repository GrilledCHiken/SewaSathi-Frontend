package com.sewasathi.exception;

public class SuspendedAccountException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private static final String GENERIC = "This account has been suspended. Contact support for details.";

    public SuspendedAccountException() {
        this(null);
    }

    /**
     * @param reason what the admin typed when suspending the account, or null for accounts
     *               suspended before reasons were recorded - those still get the flat notice
     *               rather than a sentence trailing off into nothing.
     */
    public SuspendedAccountException(String reason) {
        super(reason == null || reason.isBlank()
                ? GENERIC
                : "This account has been suspended. Reason: " + reason.trim());
    }
}
