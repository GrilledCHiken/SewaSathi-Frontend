package com.sewasathi.entity;

/** How an account authenticates. Stored so a password account and a social account cannot be silently conflated. */
public enum AuthProvider {
    /** Email and password held by us. */
    LOCAL,
    GOOGLE,
    FACEBOOK
}
