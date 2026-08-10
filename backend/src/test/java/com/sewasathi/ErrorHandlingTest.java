package com.sewasathi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Error handling across the two surfaces (requirement #8).
 *
 * <p>The point of these tests is the split: the REST API answers in JSON, the server-rendered
 * console answers with a styled HTML page, and neither leaks a stack trace or Boot's
 * whitelabel page to a user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ErrorHandlingTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void apiValidationFailureReturnsAJsonMessage() throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    /**
     * The externalised validation messages must actually reach the caller - a regression
     * here would show up as a raw "must be a well-formed email address" default instead.
     */
    @Test
    void apiValidationMessagesComeFromTheMessageBundle() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"A\",\"email\":\"nope\",\"phone\":\"123\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .as("the message should be one of ours, not Hibernate Validator's default")
                .doesNotContain("must be a well-formed email address");
    }

    @Test
    void apiErrorsNeverLeakAStackTrace() throws Exception {
        mockMvc.perform(get("/api/tasks/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(not(containsString("com.sewasathi"))));
    }

    @Test
    void consoleErrorsRenderAsStyledHtmlNotWhitelabel() throws Exception {
        MvcResult result = mockMvc.perform(get("/admin/denied")
                        .accept(MediaType.TEXT_HTML)
                        .with(user("someone").roles("CUSTOMER")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body)
                .as("should be our own page, carrying the console stylesheet")
                .contains("/admin/assets/app.css");
        assertThat(body)
                .as("Boot's whitelabel page is disabled")
                .doesNotContain("Whitelabel Error Page");
    }

    @Test
    void unknownConsolePathIsNotFound() throws Exception {
        mockMvc.perform(get("/admin/nowhere")
                        .accept(MediaType.TEXT_HTML)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    // correlation id (requirement #10)

    /**
     * Every response carries the id that tags its log lines, which is what turns "it failed"
     * into something traceable.
     */
    @Test
    void everyResponseCarriesACorrelationId() throws Exception {
        mockMvc.perform(get("/api/tasks/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(result -> assertThat(result.getResponse().getHeader("X-Correlation-Id"))
                        .isNotBlank());
    }

    @Test
    void anInboundCorrelationIdIsEchoedBackWhenItIsSafe() throws Exception {
        mockMvc.perform(get("/api/tasks/mine").header("X-Correlation-Id", "trace-abc123"))
                .andExpect(result -> assertThat(result.getResponse().getHeader("X-Correlation-Id"))
                        .isEqualTo("trace-abc123"));
    }

    /**
     * The id is written into log files, so anything that could forge a log line - a newline
     * in particular - has to be replaced rather than echoed.
     */
    @Test
    void aMaliciousCorrelationIdIsReplacedRatherThanEchoed() throws Exception {
        mockMvc.perform(get("/api/tasks/mine")
                        .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                        .header("X-Correlation-Id", "abc\ndef INJECTED LOG LINE"))
                .andExpect(result -> assertThat(result.getResponse().getHeader("X-Correlation-Id"))
                        .doesNotContain("INJECTED")
                        .doesNotContain("\n"));
    }
}
