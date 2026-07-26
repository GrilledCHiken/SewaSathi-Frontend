package com.sewasathi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration.
 *
 * <p>This class used to map {@code /uploads/**} to the upload directory on disk, which -
 * combined with a {@code permitAll()} rule in {@link SecurityConfig} - served every
 * uploaded file to anonymous callers. Workers' citizenship documents and police clearance
 * certificates live in that directory, so any leaked or guessed URL exposed a real person's
 * identity papers.
 *
 * <p>Uploads are now served exclusively by
 * {@link com.sewasathi.controller.FileController}, which authorises each read. The resource
 * handler is deliberately not reinstated - re-adding it would silently reopen the hole.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
