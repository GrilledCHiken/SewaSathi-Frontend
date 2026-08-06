package com.sewasathi.entity;

/**
 * How an account came into existence.
 *
 * <p>Distinct from how it can be <em>signed into</em>, which is read off the account itself:
 * a non-null {@code passwordHash} means the password form works, and a non-null
 * {@code providerId} means the Google button works. Both are true for a password account that
 * has since been linked to Google, which is why this enum records only the origin and is never
 * consulted to decide whether a sign-in is allowed.
 */
public enum AuthProvider {
    LOCAL,
    GOOGLE
}
