package com.sewasathi;

import com.jayway.jsonpath.JsonPath;
import com.sewasathi.entity.User;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityBoundaryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

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
    void register_doesNotIssueAToken_untilTheEmailIsVerified() throws Exception {
        String email = "unverified-" + System.currentTimeMillis() + "@example.com";
        String registerBody = """
                {"fullName":"Unverified User","email":"%s","phone":"9800000098","password":"BoundaryPass1!"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType("application/json")
                        .content(registerBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.requiresVerification").value(true));

        // And that account cannot sign in yet: 403, distinct from the 401 a wrong password gives.
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"BoundaryPass1!"}
                                """.formatted(email)))
                .andExpect(status().isForbidden());
    }

    @Test
    void authenticatedWrongRole_isForbiddenNotUnauthorized() throws Exception {
        String email = "boundary-worker-" + System.currentTimeMillis() + "@example.com";
        String registerBody = """
                {"fullName":"Boundary Worker","email":"%s","phone":"9800000099","password":"BoundaryPass1!"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/register/worker")
                        .contentType("application/json")
                        .content(registerBody))
                .andExpect(status().isCreated());

        // Registration no longer hands back a token, so obtain one the way a real user would:
        // confirm the address, then sign in. Confirming directly through the repository keeps
        // this test about authorization rather than about email plumbing.
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setEmailVerified(true);
        userRepository.save(user);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                {"email":"%s","password":"BoundaryPass1!"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();

        String token = JsonPath.read(loginResult.getResponse().getContentAsString(), "$.token");

        // A WORKER token hitting a CUSTOMER-only endpoint must be 403 (authenticated but not
        // permitted), not 401 (which would wrongly imply the credentials themselves were rejected).
        mockMvc.perform(get("/api/tasks/mine").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
