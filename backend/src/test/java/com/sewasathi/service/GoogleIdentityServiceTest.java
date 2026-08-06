package com.sewasathi.service;

import com.sewasathi.config.GoogleIdentityConfig;
import com.sewasathi.exception.GoogleAuthException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The Google ID token checks, exercised against tokens this test signs itself with a throwaway
 * RSA key. Nothing here touches the network: the decoder is pointed at the local public key
 * instead of Google's JWKS endpoint, but the validators are the real ones from
 * {@link GoogleIdentityConfig}.
 *
 * <p>The audience case is the one that matters most. A Google ID token is a statement to one
 * particular application; without pinning {@code aud}, a token minted for any other Google app
 * would sign its bearer in here as whoever it names.
 */
class GoogleIdentityServiceTest {

    private static final String CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
    private static final String GOOGLE_ISSUER = "https://accounts.google.com";

    private static RSAKey signingKey;

    private GoogleIdentityService service;

    @BeforeAll
    static void generateKey() throws Exception {
        signingKey = new RSAKeyGenerator(2048).keyID("test-key").generate();
    }

    @BeforeEach
    void setUp() throws Exception {
        // Google's JWKS endpoint swapped for the local public key, but the production validator
        // chain - timestamp, issuer, audience - applied verbatim. That chain is what is on trial.
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withPublicKey(signingKey.toRSAPublicKey())
                .build();
        decoder.setJwtValidator(GoogleIdentityConfig.tokenValidator(CLIENT_ID));

        service = new GoogleIdentityService(decoder);
    }

    /** Claims for a token Google would legitimately have issued to this application. */
    private JWTClaimsSet.Builder validClaims() {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder()
                .subject("108134655321987654321")
                .issuer(GOOGLE_ISSUER)
                .audience(CLIENT_ID)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .claim("email", "Aaryan@Example.com")
                .claim("email_verified", true)
                .claim("name", "Aaryan Shrestha")
                .claim("picture", "https://lh3.googleusercontent.com/a/photo");
    }

    private String sign(JWTClaimsSet claims) throws Exception {
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signingKey.getKeyID()).build(),
                claims);
        jwt.sign(new RSASSASigner(signingKey));
        return jwt.serialize();
    }

    @Test
    void aGoodToken_mapsToTheIdentity() throws Exception {
        GoogleIdentity identity = service.verify(sign(validClaims().build()));

        assertThat(identity.subject()).isEqualTo("108134655321987654321");
        // Lowercased, because that is how every account in this application is keyed.
        assertThat(identity.email()).isEqualTo("aaryan@example.com");
        assertThat(identity.fullName()).isEqualTo("Aaryan Shrestha");
        assertThat(identity.avatarUrl()).isEqualTo("https://lh3.googleusercontent.com/a/photo");
    }

    @Test
    void aTokenForAnotherApplication_isRejected() throws Exception {
        String foreign = sign(validClaims()
                .audience("999999-someone-elses-app.apps.googleusercontent.com")
                .build());

        assertThatThrownBy(() -> service.verify(foreign))
                .isInstanceOf(GoogleAuthException.class);
    }

    @Test
    void aTokenFromAnotherIssuer_isRejected() throws Exception {
        String foreign = sign(validClaims().issuer("https://evil.example.com").build());

        assertThatThrownBy(() -> service.verify(foreign))
                .isInstanceOf(GoogleAuthException.class);
    }

    @Test
    void anExpiredToken_isRejected() throws Exception {
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        String expired = sign(validClaims()
                .issueTime(Date.from(past))
                .expirationTime(Date.from(past.plus(1, ChronoUnit.HOURS)))
                .build());

        assertThatThrownBy(() -> service.verify(expired))
                .isInstanceOf(GoogleAuthException.class);
    }

    @Test
    void aTokenSignedByAnotherKey_isRejected() throws Exception {
        RSAKey attackerKey = new RSAKeyGenerator(2048).keyID("test-key").generate();
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(),
                validClaims().build());
        jwt.sign(new RSASSASigner(attackerKey));

        assertThatThrownBy(() -> service.verify(jwt.serialize()))
                .isInstanceOf(GoogleAuthException.class);
    }

    @Test
    void anUnverifiedGoogleEmail_isRejected() throws Exception {
        // Sign-in matches an existing account by email address, so accepting this would let
        // anyone who can type a string into a Google profile field walk into that account.
        String unverified = sign(validClaims().claim("email_verified", false).build());

        assertThatThrownBy(() -> service.verify(unverified))
                .isInstanceOf(GoogleAuthException.class)
                .hasMessageContaining("not verified");
    }

    @Test
    void aMissingEmail_isRejected() throws Exception {
        String noEmail = sign(validClaims().claim("email", null).build());

        assertThatThrownBy(() -> service.verify(noEmail))
                .isInstanceOf(GoogleAuthException.class);
    }

    @Test
    void aNamelessAccount_fallsBackToTheEmailLocalPart() throws Exception {
        GoogleIdentity identity = service.verify(sign(validClaims().claim("name", null).build()));

        assertThat(identity.fullName()).isEqualTo("aaryan");
    }

    @Test
    void anOverLongPicture_isDroppedRatherThanTruncated() throws Exception {
        // avatar_url is 500 characters. A clipped URL would render as a broken image, which is
        // worse than showing initials.
        String longUrl = "https://lh3.googleusercontent.com/" + "a".repeat(500);
        GoogleIdentity identity = service.verify(sign(validClaims().claim("picture", longUrl).build()));

        assertThat(identity.avatarUrl()).isNull();
    }

    @Test
    void anOverLongName_isTrimmedToTheColumnWidth() throws Exception {
        GoogleIdentity identity =
                service.verify(sign(validClaims().claim("name", "N".repeat(400)).build()));

        assertThat(identity.fullName()).hasSize(150);
    }

    @Test
    void emailVerifiedAsAString_isStillAccepted() throws Exception {
        // Some libraries render the claim as "true" rather than a JSON boolean.
        GoogleIdentity identity =
                service.verify(sign(validClaims().claim("email_verified", "true").build()));

        assertThat(identity.email()).isEqualTo("aaryan@example.com");
    }

    @Test
    void garbage_isRejected() {
        assertThatThrownBy(() -> service.verify("not-a-jwt"))
                .isInstanceOf(GoogleAuthException.class);
    }
}
