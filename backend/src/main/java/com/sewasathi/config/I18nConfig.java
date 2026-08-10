package com.sewasathi.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;
import org.springframework.web.servlet.i18n.SessionLocaleResolver;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Internationalization (requirement #11). One bundle - {@code messages.properties} - backs the
 * Thymeleaf views, bean-validation message templates on the request DTOs, and the REST API's
 * error bodies. A new language needs only {@code messages_<lang>.properties} beside it.
 */
@Configuration
public class I18nConfig {

    public static final Locale DEFAULT_LOCALE = Locale.ENGLISH;

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasename("classpath:messages");
        // Property files default to ISO-8859-1, which would mangle Devanagari.
        messageSource.setDefaultEncoding(StandardCharsets.UTF_8.name());
        messageSource.setFallbackToSystemLocale(false);
        // Surface a missing key as "??key??" rather than silently echoing the code.
        messageSource.setUseCodeAsDefaultMessage(false);
        return messageSource;
    }

    /**
     * Holds the chosen language on the session so the console's language switcher persists
     * across pages. Falls back to {@code Accept-Language} on the first request.
     */
    @Bean
    public LocaleResolver localeResolver() {
        SessionLocaleResolver resolver = new SessionLocaleResolver();
        resolver.setDefaultLocale(DEFAULT_LOCALE);
        return resolver;
    }

    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        // A bad ?lang= value is a typo in a URL, not grounds for failing the request.
        interceptor.setIgnoreInvalidLocale(true);
        return interceptor;
    }

    /**
     * Points bean validation at the same bundle, so {@code @NotBlank(message =
     * "{validation.email.required}")} resolves in the caller's language.
     */
    @Bean
    public LocalValidatorFactoryBean validator(MessageSource messageSource) {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.setValidationMessageSource(messageSource);
        return validator;
    }
}
