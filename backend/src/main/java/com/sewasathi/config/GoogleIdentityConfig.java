package com.sewasathi.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.List;
import java.util.Set;

/**
 * Verifies Google's signature on an ID token posted by the "Sign in with Google" button.
 * Distinct from {@code JwtService}, which signs our own access tokens with a symmetric
 * secret; this checks someone else's tokens against Google's rotating public keys.
 */
@Configuration
public class GoogleIdentityConfig {

    /** Google has issued tokens under both spellings; both are legitimate. */
    private static final Set<String> GOOGLE_ISSUERS =
            Set.of("https://accounts.google.com", "accounts.google.com");

    @Bean
    public JwtDecoder googleIdTokenDecoder(
            @Value("${app.google.jwk-set-uri}") String jwkSetUri,
            @Value("${app.google.client-id}") String clientId) {

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        decoder.setJwtValidator(tokenValidator(clientId));
        return decoder;
    }

    /**
     * Claim checks, kept separate from the key source so tests can run the real chain against
     * a local key. Replacing the decoder's default validator is not additive, so the timestamp
     * check has to be restated here.
     */
    public static OAuth2TokenValidator<Jwt> tokenValidator(String clientId) {
        return new DelegatingOAuth2TokenValidator<>(List.of(
                new JwtTimestampValidator(),
                issuerValidator(),
                audienceValidator(clientId)));
    }

    private static OAuth2TokenValidator<Jwt> issuerValidator() {
        return jwt -> GOOGLE_ISSUERS.contains(jwt.getIssuer() == null ? null : jwt.getIssuer().toString())
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_issuer", "The token was not issued by Google", null));
    }

    /**
     * Without pinning {@code aud} to our own client ID, a token minted for any other Google
     * app would be accepted and would sign its holder in as whoever it names.
     */
    private static OAuth2TokenValidator<Jwt> audienceValidator(String clientId) {
        return jwt -> jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_audience", "The token was issued for a different application", null));
    }
}
