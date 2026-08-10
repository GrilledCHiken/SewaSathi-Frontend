package com.sewasathi.config;

import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.webmvc.error.DefaultErrorAttributes;
import org.springframework.boot.webmvc.error.ErrorAttributes;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.WebRequest;

import java.util.Map;

/**
 * Adds the correlation id to the error-page model (requirement #8). Read from a request
 * attribute rather than the MDC, which {@link CorrelationIdFilter} clears before the
 * container dispatches to {@code /error}.
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
