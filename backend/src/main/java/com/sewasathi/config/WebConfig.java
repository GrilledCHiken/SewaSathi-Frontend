package com.sewasathi.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

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
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final LocaleChangeInterceptor localeChangeInterceptor;

    /**
     * Lets any request switch language with {@code ?lang=xx} (requirement #11). Registering
     * the interceptor is what makes the console's language switcher work - without it the
     * parameter is read by nothing and the locale never changes.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor);
    }
}
