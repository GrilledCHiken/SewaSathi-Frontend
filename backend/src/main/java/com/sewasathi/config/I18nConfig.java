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
 * Internationalization (requirement #11).
 *
 * <p>One bundle - {@code messages.properties} - backs three surfaces: the Thymeleaf views via
 * {@code #{...}}, bean-validation failures via {@code {key}} message templates on the request
 * DTOs, and the REST API's error bodies. Adding {@code messages_ne.properties} beside it is
 * all a new language needs; nothing here changes.
 */
@Configuration
public class I18nConfig {

    /** Language the app falls back to when the request expresses no usable preference. */
    public static final Locale DEFAULT_LOCALE = Locale.ENGLISH;

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasename("classpath:messages");
        // Property files are ISO-8859-1 by default, which would mangle any non-Latin script -
        // Devanagari among them - the moment a translated bundle is added.
        messageSource.setDefaultEncoding(StandardCharsets.UTF_8.name());
        messageSource.setFallbackToSystemLocale(false);
        // Surface a missing key as a visible "??key??" rather than silently echoing the code,
        // so an untranslated string is caught in review instead of shipping.
        messageSource.setUseCodeAsDefaultMessage(false);
        return messageSource;
    }

    /**
     * Remembers the chosen language on the session, so a click in the console's language
     * switcher persists across pages instead of having to be re-appended to every link.
     *
     * <p>Falls back to the browser's {@code Accept-Language} on the first request, which is
     * how the REST API - which never carries a session - resolves its locale too.
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
        // A bad ?lang= value is a typo in a URL, not something worth failing the request over.
        interceptor.setIgnoreInvalidLocale(true);
        return interceptor;
    }

    /**
     * Points bean validation at the same bundle, so a DTO can declare
     * {@code @NotBlank(message = "{validation.email.required}")} and have the text resolved
     * from {@code messages.properties} in the caller's language.
     */
    @Bean
    public LocalValidatorFactoryBean validator(MessageSource messageSource) {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.setValidationMessageSource(messageSource);
        return validator;
    }
}
