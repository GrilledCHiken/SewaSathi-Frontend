package com.sewasathi.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Sends a failed social sign-in back to the login page with a message the user can act on.
 *
 * <p>{@link CustomOAuth2UserService} raises deliberate, specific errors - "that email
 * already has a password account", "your provider email is not verified" - and those are
 * worth surfacing verbatim. Anything else is reported generically, since unexpected OAuth
 * errors can carry provider internals.
 */
@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2FailureHandler.class);

    private static final java.util.Set<String> SAFE_TO_SHOW = java.util.Set.of(
            "provider_mismatch", "email_unverified", "email_missing",
            "account_suspended", "unsupported_provider");

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        String message = "Sign-in failed. Please try again.";

        if (exception instanceof OAuth2AuthenticationException oauthException) {
            String code = oauthException.getError().getErrorCode();
            if (SAFE_TO_SHOW.contains(code)) {
                message = oauthException.getError().getDescription();
            }
            log.info("OAuth sign-in failed: {}", code);
        } else {
            log.warn("OAuth sign-in failed", exception);
        }

        response.sendRedirect(trimTrailingSlash(frontendUrl) + "/login?error="
                + URLEncoder.encode(message, StandardCharsets.UTF_8));
    }

    private static String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
