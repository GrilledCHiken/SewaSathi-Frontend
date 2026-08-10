package com.sewasathi.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;

/**
 * Deliberately maps no {@code /uploads/**} resource handler: uploads are served only by
 * {@link com.sewasathi.controller.FileController}, which authorises each read. Adding one
 * here would expose workers' identity documents to anyone with the URL.
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final LocaleChangeInterceptor localeChangeInterceptor;

    /** Lets any request switch language with {@code ?lang=xx} (requirement #11). */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor);
    }
}
