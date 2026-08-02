package com.sewasathi.config;

import com.sewasathi.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
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
import org.springframework.security.web.session.HttpSessionEventPublisher;
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

    /**
     * Session-backed chain for the server-rendered admin console.
     *
     * <p>Ordered first so it claims {@code /admin/**} before the stateless API chain below
     * sees it. The two surfaces authenticate completely differently - a session cookie here,
     * a bearer token there - and the settings that make one safe make the other unusable,
     * which is precisely why they are separate chains rather than one chain with exceptions.
     *
     * <p>CSRF is <em>on</em> here. Unlike the API chain, this one authenticates from an
     * ambient cookie the browser attaches to any cross-site form post, so a forged request
     * would otherwise carry the admin's credentials.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain adminFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/admin/**")
                .csrf(withDefaults -> {})
                .headers(headers -> headers
                        .contentTypeOptions(withDefaults -> {})
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        // Deliberately looser than the API chain's "default-src 'none'; sandbox",
                        // which would blank these pages: they legitimately load their own
                        // stylesheet and script. Still no third-party origins, and no inline
                        // script - app.js is a separate file so this can stay 'self'.
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; "
                                        + "base-uri 'self'; form-action 'self'"))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        // Issue a fresh session id on login so a session fixed by an attacker
                        // before sign-in cannot be reused after it.
                        .sessionFixation(fixation -> fixation.migrateSession())
                        // Where the browser lands when it presents a session the server has
                        // already timed out - see server.servlet.session.timeout.
                        .invalidSessionUrl("/admin/login?expired")
                        .sessionConcurrency(concurrency -> concurrency
                                .maximumSessions(1)
                                .maxSessionsPreventsLogin(false)
                                .expiredUrl("/admin/login?expired"))
                )
                .authorizeHttpRequests(auth -> auth
                        // /admin/denied must be reachable by the very users it exists to turn
                        // away - a signed-in CUSTOMER - so it cannot sit behind hasRole("ADMIN").
                        .requestMatchers("/admin/login", "/admin/assets/**", "/admin/denied").permitAll()
                        .anyRequest().hasRole("ADMIN")
                )
                .formLogin(form -> form
                        .loginPage("/admin/login")
                        .loginProcessingUrl("/admin/login")
                        .defaultSuccessUrl("/admin/dashboard", true)
                        .failureUrl("/admin/login?error")
                        .permitAll()
                )
                .logout(logout -> logout
                        .logoutUrl("/admin/logout")
                        .logoutSuccessUrl("/admin/login?loggedOut")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                )
                // A signed-in non-admin gets the styled 403 page rather than a raw status.
                .exceptionHandling(ex -> ex.accessDeniedPage("/admin/denied"))
                .authenticationProvider(authenticationProvider());

        return http.build();
    }

    /**
     * Concurrency control ({@code maximumSessions} above) only notices a session ending if
     * the container publishes session lifecycle events. Without this, expired and logged-out
     * sessions linger in the registry and an admin eventually locks themselves out.
     */
    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF is disabled because this filter chain is stateless and authenticates
                // from an Authorization header, never an ambient cookie - so a cross-site
                // form post carries no credentials and has nothing to forge. The
                // session-backed admin chain above, which does authenticate from a cookie,
                // keeps CSRF switched on.
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
                        // "Sign out everywhere" acts on the caller's own account, so it needs
                        // a token. Everything else under /api/auth is reachable
                        // pre-authentication by definition - including /refresh, whose whole
                        // purpose is to run once the access token has already expired.
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout-all").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/newsletter/subscribe").permitAll()
                        // The marketing pages are served to visitors who have no account, so the
                        // figures on them have to be readable without one. GET only, and
                        // PublicController returns nothing but aggregates and anonymised rows -
                        // it takes no id and cannot be pointed at an individual's record.
                        .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
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

        return http.build();
    }
}
