package com.sewasathi.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Error handling for the server-rendered console (requirement #8).
 *
 * <p>The counterpart to {@link GlobalExceptionHandler}: these handlers return view names under
 * {@code templates/error/} rather than JSON. Scoped to {@code com.sewasathi.controller.web}.
 * {@link com.sewasathi.controller.web.AdminWebApiController} is a {@code @RestController} and
 * is left to the JSON handler, since its callers parse the response body.
 */
@ControllerAdvice(basePackages = "com.sewasathi.controller.web")
public class WebExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(WebExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String handleNotFound(ResourceNotFoundException ex) {
        log.debug("Admin console 404: {}", ex.getMessage());
        return "error/404";
    }

    @ExceptionHandler(InvalidOperationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleInvalidOperation(InvalidOperationException ex) {
        log.debug("Admin console rejected an operation: {}", ex.getMessage());
        return "error/400";
    }

    /**
     * Last resort. The message is deliberately not shown to the user - the page carries the
     * correlation id instead, which points at this log line without leaking a stack trace.
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleGeneric(Exception ex) {
        log.error("Unhandled exception in the admin console", ex);
        return "error/500";
    }
}
