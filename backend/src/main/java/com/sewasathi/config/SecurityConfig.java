package com.sewasathi.config;

import com.sewasathi.security.CustomOAuth2UserService;
import com.sewasathi.security.JwtAuthFilter;
import com.sewasathi.security.OAuth2FailureHandler;
import com.sewasathi.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
// Enables @PreAuthorize/@PostAuthorize on service methods. The URL rules below stay as the
// coarse first line; method annotations add a second, closer to the data they protect.
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final CustomOAuth2UserService oAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final OAuth2FailureHandler oAuth2FailureHandler;

    /**
     * Present only when spring.security.oauth2.client.registration.* is configured. Held as
     * a provider so the application still starts with no social-login credentials - calling
     * oauth2Login() unconditionally would fail startup with "No ClientRegistrationRepository
     * bean" the moment the placeholders were left blank.
     */
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    /**
     * Comma-separated origins allowed to call the API. Externalised so production does
     * not inherit the localhost dev origins.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:5174}")
    private String[] allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept-Language", "X-Correlation-Id"));
        config.setExposedHeaders(List.of("X-Correlation-Id"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF is disabled because this filter chain is stateless and authenticates
                // from an Authorization header, never an ambient cookie - so a cross-site
                // form post carries no credentials and has nothing to forge. (A future
                // session-backed, server-rendered surface would need CSRF switched back on
                // for its own chain.)
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .headers(headers -> headers
                        .contentTypeOptions(withDefaults -> {})
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        // The API returns JSON, never HTML that loads sub-resources, so the
                        // policy can be maximally restrictive. It matters because an uploaded
                        // file served from this origin would otherwise be a script vector.
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; frame-ancestors 'none'; sandbox"))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpStatus.UNAUTHORIZED.value(), "Authentication required"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                response.sendError(HttpStatus.FORBIDDEN.value(), "Access is denied"))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        // /uploads/** is deliberately absent. It used to be permitAll, which
                        // served workers' citizenship and police-clearance documents to
                        // anyone with the URL. Uploads now go through /api/files/**, which
                        // checks ownership per file.
                        .requestMatchers("/api/files/**").authenticated()
                        // Liveness probes must work without credentials; everything that
                        // could leak configuration or metrics is admin-only.
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        // 2FA toggles act on the caller's own account, so they need a token.
                        // Everything else under /api/auth is reachable pre-authentication by
                        // definition - including resend-verification, since an unverified
                        // account has no way to obtain a token.
                        .requestMatchers(HttpMethod.POST, "/api/auth/2fa/**").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        // Spring Security's own OAuth entry point and redirect URI.
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/newsletter/subscribe").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/tasks").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/tasks/mine").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.PATCH, "/api/tasks/*/cancel").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.PATCH, "/api/tasks/*/assign").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/dashboard/**").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/workers").hasRole("CUSTOMER")
                        .requestMatchers("/api/reviews/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/payments/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/conversations/**").authenticated()
                        .requestMatchers("/api/messages/**").authenticated()
                        .requestMatchers("/api/worker/**").hasRole("WORKER")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        if (clientRegistrationRepository.getIfAvailable() != null) {
            http.oauth2Login(oauth -> oauth
                    .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                    .successHandler(oAuth2SuccessHandler)
                    .failureHandler(oAuth2FailureHandler)
            );
        }

        return http.build();
    }
}
