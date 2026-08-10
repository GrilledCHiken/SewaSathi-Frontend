package com.sewasathi.service;

import com.sewasathi.exception.GoogleAuthException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

/**
 * Turns the ID token the browser gets from Google into a {@link GoogleIdentity}, or refuses it.
 * Signature, issuer, audience and expiry are checked by the decoder in
 * {@link com.sewasathi.config.GoogleIdentityConfig}; what is left here is {@code email_verified}.
 * Sign-in matches an existing account by email, so an unverified one would let anybody who can
 * type a string into a Google profile field walk into someone else's account.
 */
@Service
public class GoogleIdentityService {

    private static final Logger log = LoggerFactory.getLogger(GoogleIdentityService.class);

    private final JwtDecoder googleIdTokenDecoder;

    public GoogleIdentityService(JwtDecoder googleIdTokenDecoder) {
        this.googleIdTokenDecoder = googleIdTokenDecoder;
    }

    public GoogleIdentity verify(String credential) {
        Jwt jwt;
        try {
            jwt = googleIdTokenDecoder.decode(credential);
        } catch (JwtException e) {
            // Logged at debug: a rejected token is an ordinary event on a public endpoint, and
            // the token itself must not reach the log.
            log.debug("Rejected Google ID token: {}", e.getMessage());
            throw new GoogleAuthException("That Google sign-in could not be verified.", e);
        }

        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new GoogleAuthException("That Google account has no email address.");
        }

        if (!isEmailVerified(jwt)) {
            throw new GoogleAuthException(
                    "That Google account's email address is not verified. Verify it with Google and try again.");
        }

        String name = jwt.getClaimAsString("name");
        String normalisedEmail = email.trim().toLowerCase();

        return new GoogleIdentity(
                jwt.getSubject(),
                normalisedEmail,
                // users.full_name is 150 and nothing bounds a Google profile field, so an
                // over-long name is trimmed rather than left to fail the insert.
                clip(name == null || name.isBlank() ? normalisedEmail.split("@")[0] : name.trim(), 150),
                // users.avatar_url is 500. A truncated URL renders as a broken image, so an
                // over-long one is dropped instead.
                fitOrNull(jwt.getClaimAsString("picture"), 500));
    }

    private String clip(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    private String fitOrNull(String value, int max) {
        return value == null || value.length() <= max ? value : null;
    }

    /**
     * Google sends this as a JSON boolean, but the claim has historically also appeared as the
     * string "true" through some libraries. Anything else - including absent - counts as
     * unverified.
     */
    private boolean isEmailVerified(Jwt jwt) {
        Object claim = jwt.getClaim("email_verified");
        if (claim instanceof Boolean verified) {
            return verified;
        }
        return claim instanceof String text && Boolean.parseBoolean(text);
    }
}
