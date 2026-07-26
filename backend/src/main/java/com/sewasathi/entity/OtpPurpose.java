package com.sewasathi.entity;

/** Why a one-time code was issued. Kept on the token so a code minted for one flow cannot be replayed in another. */
public enum OtpPurpose {
    /** The account has two-factor authentication switched on, so every sign-in is challenged. */
    LOGIN_2FA,
    /** Sign-in from a device fingerprint we have not seen for this account before. */
    NEW_DEVICE
}
