package com.sewasathi.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * Tells the sign-in page which social providers are actually configured.
 *
 * <p>Without this the SPA would have to hardcode "Google" and "Facebook" buttons that lead
 * nowhere whenever credentials have not been filled in - which is the default state of a
 * fresh checkout. The list is empty until real client ids are configured, and the buttons
 * simply do not render.
 */
@RestController
@RequestMapping("/api/auth/providers")
@RequiredArgsConstructor
public class AuthProviderController {

    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    @GetMapping
    public ResponseEntity<List<String>> configuredProviders() {
        ClientRegistrationRepository repository = clientRegistrationRepository.getIfAvailable();
        if (repository == null) {
            return ResponseEntity.ok(List.of());
        }

        List<String> ids = new ArrayList<>();
        // Only the in-memory repository is enumerable; a custom one would have to expose its
        // own listing, so fall back to reporting nothing rather than guessing.
        if (repository instanceof InMemoryClientRegistrationRepository inMemory) {
            for (ClientRegistration registration : inMemory) {
                ids.add(registration.getRegistrationId());
            }
        }
        return ResponseEntity.ok(ids);
    }
}
