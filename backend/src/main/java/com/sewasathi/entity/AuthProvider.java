package com.sewasathi.entity;

/**
 * How an account came into existence. Records origin only and is never consulted to decide
 * whether a sign-in is allowed - that is read off the account: a non-null {@code passwordHash}
 * means the password form works, a non-null {@code providerId} means the Google button does.
 */
public enum AuthProvider {
    LOCAL,
    GOOGLE
}
