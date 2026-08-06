package com.sewasathi.service;

import com.sewasathi.dto.response.AuthResponse;
import com.sewasathi.dto.response.GoogleSignupResponse;

/**
 * What a verified Google identity turned out to mean. Three outcomes, and the controller maps
 * each to its own status code - a signed-in session is not a creation, and neither is the
 * "we still need a phone number" case, which creates nothing at all.
 */
public sealed interface GoogleSignInOutcome {

    /** An existing account, now signed in. 200. */
    record SignedIn(AuthResponse response) implements GoogleSignInOutcome {
    }

    /** A new account, created and signed in. 201. */
    record Created(AuthResponse response) implements GoogleSignInOutcome {
    }

    /** No account yet, and Google cannot tell us the phone number we need. 202. */
    record NeedsProfile(GoogleSignupResponse response) implements GoogleSignInOutcome {
    }
}
