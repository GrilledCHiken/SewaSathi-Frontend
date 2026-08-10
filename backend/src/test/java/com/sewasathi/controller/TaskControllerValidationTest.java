package com.sewasathi.controller;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Bean validation on POST /api/tasks.
 *
 * <p>{@code TaskServiceTest} calls the service directly, so {@code @Valid} never runs there.
 * Without these constraints an over-length title or oversized budget reaches the column and
 * fails as a 500 rather than a 400.
 *
 * <p>All are rejected during argument resolution, before the controller body, so no customer
 * needs to exist - only a role that clears the security rule.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    /** A body that passes every constraint; each test swaps one field for a bad value. */
    private String body(String field, String jsonValue) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("title", "\"Clean my flat\"");
        fields.put("category", "\"Cleaning\"");
        fields.put("description", "\"Two bedrooms and a kitchen - deep clean please.\"");
        fields.put("city", "\"Kathmandu\"");
        fields.put("location", "\"Baneshwor\"");
        fields.put("budget", "1500");
        fields.put("hourlyRate", "null");
        fields.put("dueDate", "null");
        fields.put("timePreference", "\"Flexible\"");
        fields.put(field, jsonValue);

        return fields.entrySet().stream()
                .map(entry -> "\"" + entry.getKey() + "\":" + entry.getValue())
                .collect(Collectors.joining(",", "{", "}"));
    }

    private void expectBadRequest(String field, String jsonValue) throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(field, jsonValue)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(Matchers.startsWith(field + ":")));
    }

    @Test
    void aDueDateInThePast_isRejected() throws Exception {
        expectBadRequest("dueDate", "\"" + LocalDate.now().minusDays(1) + "\"");
    }

    @Test
    void aNegativeBudget_isRejected() throws Exception {
        expectBadRequest("budget", "-500");
    }

    @Test
    void aZeroBudget_isRejected() throws Exception {
        expectBadRequest("budget", "0");
    }

    @Test
    void aBudgetBelowTheMinimum_isRejected() throws Exception {
        expectBadRequest("budget", "50");
    }

    /** Used to overflow the precision-10 column and surface as a 500. */
    @Test
    void aBudgetAboveTheMaximum_isRejected() throws Exception {
        expectBadRequest("budget", "1000000000");
    }

    /** The column keeps two decimals; a third used to be silently rounded. */
    @Test
    void aBudgetWithThreeDecimals_isRejected() throws Exception {
        expectBadRequest("budget", "1500.999");
    }

    @Test
    void aNegativeHourlyRate_isRejected() throws Exception {
        expectBadRequest("hourlyRate", "-300");
    }

    /** Used to be a 500 from the 150-char column rather than a field error. */
    @Test
    void anOverLengthTitle_isRejected() throws Exception {
        expectBadRequest("title", "\"" + "a".repeat(200) + "\"");
    }

    @Test
    void aTitleShorterThanTheMinimum_isRejected() throws Exception {
        expectBadRequest("title", "\"Fix\"");
    }

    @Test
    void aBlankDescription_isRejected() throws Exception {
        expectBadRequest("description", "\"   \"");
    }

    @Test
    void anOverLengthLocation_isRejected() throws Exception {
        expectBadRequest("location", "\"" + "a".repeat(250) + "\"");
    }
}
