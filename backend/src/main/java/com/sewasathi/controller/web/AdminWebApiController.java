package com.sewasathi.controller.web;

import com.sewasathi.dto.request.RejectWorkerRequest;
import com.sewasathi.dto.request.SuspendUserRequest;
import com.sewasathi.dto.request.UnsuspendUserRequest;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * JSON endpoints backing the admin console's AJAX interactions (requirement #4).
 *
 * <p>Under {@code /admin/api} rather than {@code /api/admin}: the console authenticates with a
 * session cookie, which the stateless bearer-token chain would reject. Being inside the admin
 * chain, each mutation must carry a CSRF token (requirement #7), supplied by the page from a
 * {@code <meta>} tag as the {@code X-CSRF-TOKEN} header.
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
    public UserResponse rejectWorker(@PathVariable Long id, @Valid @RequestBody RejectWorkerRequest request) {
        return adminService.rejectWorker(id, request.getReason());
    }

    @PostMapping("/users/{id}/suspend")
    public AdminUserResponse suspendUser(@PathVariable Long id, @Valid @RequestBody SuspendUserRequest request) {
        return adminService.suspendUser(id, request.getReason().trim());
    }

    /** Optional body, matching {@code /api/admin}: the note only enriches the email. */
    @PostMapping("/users/{id}/unsuspend")
    public AdminUserResponse unsuspendUser(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) UnsuspendUserRequest request) {
        return adminService.unsuspendUser(id, request == null ? null : request.getNote());
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
