package com.sewasathi.controller.web;

import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * JSON endpoints backing the admin console's AJAX interactions (requirement #4).
 *
 * <p>These live under {@code /admin/api} rather than reusing {@code /api/admin} on purpose:
 * the console authenticates with a session cookie, and {@code /api/admin} sits on the
 * stateless bearer-token chain, which would reject every one of these calls. Being inside the
 * admin chain also means each mutation below must carry a CSRF token (requirement #7) - the
 * page supplies it from a {@code <meta>} tag as the {@code X-CSRF-TOKEN} header.
 */
@RestController
@RequestMapping("/admin/api")
@RequiredArgsConstructor
public class AdminWebApiController {

    private final AdminService adminService;

    @PostMapping("/workers/{id}/approve")
    public UserResponse approveWorker(@PathVariable Long id) {
        return adminService.approveWorker(id);
    }

    @PostMapping("/workers/{id}/reject")
    public UserResponse rejectWorker(@PathVariable Long id) {
        return adminService.rejectWorker(id);
    }

    @PostMapping("/users/{id}/suspend")
    public AdminUserResponse suspendUser(@PathVariable Long id) {
        return adminService.suspendUser(id);
    }

    @PostMapping("/users/{id}/unsuspend")
    public AdminUserResponse unsuspendUser(@PathVariable Long id) {
        return adminService.unsuspendUser(id);
    }

    /**
     * How long an idle session has before the container drops it. The page counts down
     * locally from this rather than polling, because any request - a poll included - resets
     * the server's idle clock and would keep the session alive forever.
     */
    @PostMapping("/session/extend")
    public Map<String, Object> extendSession(HttpServletRequest request) {
        HttpSession session = request.getSession();
        return Map.of(
                "maxInactiveIntervalSeconds", session.getMaxInactiveInterval(),
                "extended", true
        );
    }
}
