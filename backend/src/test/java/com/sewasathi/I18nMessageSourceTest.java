package com.sewasathi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Guards the internationalization wiring (requirement #11).
 *
 * <p>The valuable test here is the last one: it walks every Thymeleaf template, pulls out
 * each {@code #{...}} reference, and insists the bundle can resolve it. A missing key
 * otherwise renders as {@code ??key??} on a live page, which nothing else would catch.
 */
@SpringBootTest
@ActiveProfiles("test")
class I18nMessageSourceTest {

    /** Matches Thymeleaf message expressions: #{some.key} and th:text="#{some.key}". */
    private static final Pattern MESSAGE_KEY = Pattern.compile("#\\{([A-Za-z0-9._-]+)}");

    @Autowired
    private MessageSource messageSource;

    @Test
    void resolvesAKnownKey() {
        assertThat(messageSource.getMessage("admin.brand", null, Locale.ENGLISH))
                .isEqualTo("Sewa Sathi");
    }

    /**
     * An unknown locale must fall back to the English bundle rather than to the machine's
     * system locale, which would make behaviour depend on where the app happens to run.
     */
    @Test
    void unknownLocaleFallsBackToTheDefaultBundle() {
        assertThat(messageSource.getMessage("admin.brand", null, Locale.of("fr", "FR")))
                .isEqualTo("Sewa Sathi");
    }

    /**
     * useCodeAsDefaultMessage is off on purpose: a missing key should be loud, not silently
     * rendered as its own name.
     */
    @Test
    void missingKeyRaisesRatherThanEchoingTheCode() {
        assertThatThrownBy(() -> messageSource.getMessage("no.such.key.exists", null, Locale.ENGLISH))
                .isInstanceOf(NoSuchMessageException.class);
    }

    @Test
    void validationMessagesAreExternalised() {
        assertThatCode(() -> {
            messageSource.getMessage("validation.email.invalid", null, Locale.ENGLISH);
            messageSource.getMessage("validation.password.weak", null, Locale.ENGLISH);
            messageSource.getMessage("validation.phone.invalid", null, Locale.ENGLISH);
        }).doesNotThrowAnyException();
    }

    @Test
    void everyMessageKeyUsedByATemplateResolves() throws IOException {
        Set<String> keys = collectTemplateMessageKeys();

        assertThat(keys)
                .as("the templates should be using the message bundle at all")
                .isNotEmpty();

        Set<String> unresolved = new LinkedHashSet<>();
        for (String key : keys) {
            try {
                messageSource.getMessage(key, null, Locale.ENGLISH);
            } catch (NoSuchMessageException ex) {
                unresolved.add(key);
            }
        }

        assertThat(unresolved)
                .as("templates reference message keys that messages.properties does not define")
                .isEmpty();
    }

    private Set<String> collectTemplateMessageKeys() throws IOException {
        Set<String> keys = new LinkedHashSet<>();
        Resource[] templates = new PathMatchingResourcePatternResolver()
                .getResources("classpath*:templates/**/*.html");

        for (Resource template : templates) {
            String content = template.getContentAsString(StandardCharsets.UTF_8);
            Matcher matcher = MESSAGE_KEY.matcher(content);
            while (matcher.find()) {
                keys.add(matcher.group(1));
            }
        }
        return keys;
    }
}
