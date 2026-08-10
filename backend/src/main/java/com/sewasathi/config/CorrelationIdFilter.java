package com.sewasathi.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Tags every request with a correlation id, exposed to logback as {@code %X{correlationId}}
 * and returned as the {@code X-Correlation-Id} header. Highest precedence so it wraps the
 * Spring Security chain too, making authentication failures correlatable.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = sanitize(request.getHeader(HEADER));
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString().substring(0, 8);
        }

        MDC.put(MDC_KEY, correlationId);
        response.setHeader(HEADER, correlationId);
        // Also a request attribute: the MDC is cleared below, before the container
        // dispatches to /error.
        request.setAttribute(MDC_KEY, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            // Servlet threads are pooled, so a stale id would leak into the next request.
            MDC.remove(MDC_KEY);
        }
    }

    /**
     * An inbound id is echoed into log files, so accept only short alphanumeric values -
     * otherwise a caller could inject newlines and forge log entries.
     */
    private static String sanitize(String candidate) {
        if (candidate == null || candidate.isBlank() || candidate.length() > 64) {
            return null;
        }
        return candidate.matches("[A-Za-z0-9_-]+") ? candidate : null;
    }

    /** The current request's id, for code that needs it outside the logging framework. */
    public static String current() {
        return MDC.get(MDC_KEY);
    }
}
