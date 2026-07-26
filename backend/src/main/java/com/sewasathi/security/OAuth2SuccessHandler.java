package com.sewasathi.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;

/**
 * Converts a completed OAuth handshake into the same JWT the password login issues, then
 * hands it to the SPA.
 *
 * <p>The token travels as a query parameter because the SPA and the API are separate
 * origins, so a cookie is not an option here. The callback page reads it and immediately
 * replaces the history entry, keeping it out of the address bar and browser history.
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2SuccessHandler.class);

    private final JwtService jwtService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        String email = extractEmail(authentication);
        if (email == null) {
            log.warn("OAuth success with no resolvable email; sending user back to login");
            response.sendRedirect(frontendUrl + "/login?error="
                    + URLEncoder.encode("Sign-in failed. Please try again.", StandardCharsets.UTF_8));
            return;
        }

        String token = jwtService.generateToken(email);
        String target = UriComponentsBuilder.fromUriString(trimTrailingSlash(frontendUrl) + "/oauth/callback")
                .queryParam("token", token)
                .build()
                .toUriString();

        log.info("OAuth sign-in completed for {}", email);
        response.sendRedirect(target);
    }

    private static String extractEmail(Authentication authentication) {
        if (authentication.getPrincipal() instanceof OAuth2User oauthUser) {
            Object email = oauthUser.getAttributes().get("email");
            if (email != null) {
                return email.toString().trim().toLowerCase();
            }
        }
        return null;
    }

    private static String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
