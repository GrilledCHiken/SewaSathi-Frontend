package com.sewasathi.exception;

public class DuplicateEmailException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DuplicateEmailException(String email) {
        super("An account with email '" + email + "' already exists");
    }
}
