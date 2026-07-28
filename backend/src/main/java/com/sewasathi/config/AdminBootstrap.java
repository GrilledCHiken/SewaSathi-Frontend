package com.sewasathi.config;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Creates the first administrator so a fresh clone can sign in to {@code /admin}.
 *
 * <p>Runs only when {@code app.admin.bootstrap.enabled} is true - the production profile
 * sets it to false, because a well-known default administrator is exactly the account an
 * attacker tries first. It is also a no-op whenever any ADMIN already exists, so it never
 * resurrects an account that was deliberately removed or overwrites a changed password.
 */
@Configuration
@ConditionalOnProperty(name = "app.admin.bootstrap.enabled", havingValue = "true")
@RequiredArgsConstructor
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    @Value("${app.admin.bootstrap.email}")
    private String email;

    @Value("${app.admin.bootstrap.password}")
    private String password;

    @Value("${app.admin.bootstrap.full-name:Site Administrator}")
    private String fullName;

    @Value("${app.admin.bootstrap.phone:9800000000}")
    private String phone;

    @Bean
    public ApplicationRunner seedAdministrator(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.countByRole(Role.ADMIN) > 0) {
                return;
            }

            User admin = User.builder()
                    .email(email.trim().toLowerCase())
                    .passwordHash(passwordEncoder.encode(password))
                    .fullName(fullName)
                    .phone(phone)
                    .role(Role.ADMIN)
                    .status(ApprovalStatus.APPROVED)
                    .build();
            userRepository.save(admin);

            log.warn("Created bootstrap administrator {} - change this password before deploying.", admin.getEmail());
        };
    }
}
