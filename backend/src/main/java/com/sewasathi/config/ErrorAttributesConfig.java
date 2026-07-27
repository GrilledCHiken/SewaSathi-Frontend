package com.sewasathi.config;

import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.webmvc.error.DefaultErrorAttributes;
import org.springframework.boot.webmvc.error.ErrorAttributes;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.WebRequest;

import java.util.Map;

/**
 * Adds the request's correlation id to the model behind the error pages (requirement #8),
 * so the reference a user reads off the screen is the same string that tags every log line
 * the failed request produced.
 *
 * <p>Read from a request attribute rather than the MDC: {@link CorrelationIdFilter} clears
 * the MDC when the original dispatch unwinds, which is before the container dispatches to
 * {@code /error}. Request attributes survive that hop.
 */
@Configuration
public class ErrorAttributesConfig {

    @Bean
    public ErrorAttributes errorAttributes() {
        return new DefaultErrorAttributes() {
            @Override
            public Map<String, Object> getErrorAttributes(WebRequest webRequest, ErrorAttributeOptions options) {
                Map<String, Object> attributes = super.getErrorAttributes(webRequest, options);
                Object correlationId = webRequest.getAttribute(
                        CorrelationIdFilter.MDC_KEY, WebRequest.SCOPE_REQUEST);
                if (correlationId != null) {
                    attributes.put("correlationId", correlationId);
                }
                return attributes;
            }
        };
    }
}
