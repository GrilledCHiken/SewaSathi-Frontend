package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityBoundaryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void tasksMine_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/tasks/mine"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminOverview_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workerTasks_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/worker/tasks/open"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authRegisterCustomer_isPubliclyReachable() throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void authenticatedWrongRole_isForbiddenNotUnauthorized() throws Exception {
        String email = "boundary-worker-" + System.currentTimeMillis() + "@example.com";
        String registerBody = """
                {"fullName":"Boundary Worker","email":"%s","phone":"9800000099","password":"password123"}
                """.formatted(email);

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register/worker")
                        .contentType("application/json")
                        .content(registerBody))
                .andExpect(status().isCreated())
                .andReturn();

        String token = JsonPath.read(registerResult.getResponse().getContentAsString(), "$.token");

        // A WORKER token hitting a CUSTOMER-only endpoint must be 403 (authenticated but not
        // permitted), not 401 (which would wrongly imply the credentials themselves were rejected).
        mockMvc.perform(get("/api/tasks/mine").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
