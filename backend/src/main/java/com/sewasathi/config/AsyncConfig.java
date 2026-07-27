package com.sewasathi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables the scheduler behind {@link com.sewasathi.service.RefreshTokenService#purgeExpired()}.
 *
 * <p>This class also used to define a {@code mailExecutor} pool for asynchronous email
 * delivery. With no outbound email left in the application there is nothing to run off the
 * request thread, so the pool and {@code @EnableAsync} are gone.
 */
@Configuration
@EnableScheduling
public class AsyncConfig {
}
