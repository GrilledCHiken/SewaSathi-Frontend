package com.sewasathi.security;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.AuthProvider;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Turns a Google or Facebook profile into a Sewa Sathi account.
 *
 * <p>Accounts are matched by email address, which is the only identifier the two systems
 * share. Two rules keep that safe:
 *
 * <ul>
 *   <li><b>Unverified provider emails are rejected.</b> If a provider will not vouch that the
 *       address belongs to this person, matching on it would let anyone claim an existing
 *       account by signing up elsewhere with the same address.</li>
 *   <li><b>A different provider on the same address is refused, not merged.</b> Silently
 *       linking a Facebook login into an account created with Google - or with a password -
 *       would turn "who can read this inbox" into "who owns this account".</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final Logger log = LoggerFactory.getLogger(CustomOAuth2UserService.class);

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User oauthUser = super.loadUser(request);
        String registrationId = request.getClientRegistration().getRegistrationId();

        AuthProvider provider = switch (registrationId.toLowerCase()) {
            case "google" -> AuthProvider.GOOGLE;
            case "facebook" -> AuthProvider.FACEBOOK;
            default -> throw oauthError("unsupported_provider",
                    "Sign-in provider '" + registrationId + "' is not supported.");
        };

        Map<String, Object> attributes = oauthUser.getAttributes();
        String rawEmail = stringAttribute(attributes, "email");
        if (rawEmail == null || rawEmail.isBlank()) {
            throw oauthError("email_missing",
                    "Your " + provider + " account did not share an email address, which Sewa Sathi needs.");
        }
        final String email = rawEmail.trim().toLowerCase();

        if (!isEmailVerifiedByProvider(provider, attributes)) {
            throw oauthError("email_unverified",
                    "Your " + provider + " email address is not verified, so it cannot be used to sign in.");
        }

        String providerId = stringAttribute(attributes, provider == AuthProvider.GOOGLE ? "sub" : "id");
        String name = stringAttribute(attributes, "name");

        User user = userRepository.findByEmail(email)
                .map(existing -> reconcile(existing, provider, providerId))
                .orElseGet(() -> provision(email, name, provider, providerId));

        if (user.isSuspended()) {
            throw oauthError("account_suspended", "This account has been suspended.");
        }

        // The principal name is the email, matching what JwtService puts in the subject, so
        // the rest of the application sees an identical identity either way.
        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                attributes,
                provider == AuthProvider.GOOGLE ? "sub" : "id");
    }

    /**
     * Google returns email_verified; Facebook only returns an email at all once it is
     * confirmed, so its presence is the signal.
     */
    private static boolean isEmailVerifiedByProvider(AuthProvider provider, Map<String, Object> attributes) {
        if (provider == AuthProvider.FACEBOOK) {
            return true;
        }
        Object verified = attributes.get("email_verified");
        if (verified instanceof Boolean b) {
            return b;
        }
        return verified != null && Boolean.parseBoolean(verified.toString());
    }

    private User reconcile(User existing, AuthProvider provider, String providerId) {
        if (existing.getAuthProvider() != provider) {
            throw oauthError("provider_mismatch", switch (existing.getAuthProvider()) {
                case LOCAL -> "That email already has a Sewa Sathi password account. "
                        + "Sign in with your password instead.";
                default -> "That email is already registered using "
                        + existing.getAuthProvider() + " sign-in.";
            });
        }
        if (providerId != null && !providerId.equals(existing.getProviderId())) {
            existing.setProviderId(providerId);
            userRepository.save(existing);
        }
        return existing;
    }

    private User provision(String email, String name, AuthProvider provider, String providerId) {
        User user = User.builder()
                .email(email)
                .fullName(name == null || name.isBlank() ? email.split("@")[0] : name.trim())
                // No password is ever usable on a social account: a random hash means the
                // password path cannot be entered, and "forgot password" simply mints a new
                // one rather than exposing anything.
                .passwordHash("{noop-unusable}" + UUID.randomUUID())
                // The provider does not share a phone number and the column is NOT NULL;
                // the user completes this from their profile page.
                .phone("")
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                // The provider already proved control of the inbox, so re-verifying is noise.
                .emailVerified(true)
                .authProvider(provider)
                .providerId(providerId)
                .build();
        log.info("Provisioned new {} account for {}", provider, email);
        return userRepository.save(user);
    }

    private static String stringAttribute(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        return value == null ? null : value.toString();
    }

    private static OAuth2AuthenticationException oauthError(String code, String description) {
        return new OAuth2AuthenticationException(new OAuth2Error(code, description, null), description);
    }
}
