package com.sewasathi.controller;

import com.sewasathi.dto.response.AdminOverviewResponse;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.PendingWorkerResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/overview")
    public AdminOverviewResponse overview() {
        return adminService.getOverview();
    }

    @GetMapping("/workers/pending")
    public List<PendingWorkerResponse> pendingWorkers() {
        return adminService.listPendingWorkers();
    }

    @PatchMapping("/workers/{id}/approve")
    public UserResponse approveWorker(@PathVariable Long id) {
        return adminService.approveWorker(id);
    }

    @PatchMapping("/workers/{id}/reject")
    public UserResponse rejectWorker(@PathVariable Long id) {
        return adminService.rejectWorker(id);
    }

    @GetMapping("/users")
    public List<AdminUserResponse> users(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) ApprovalStatus status
    ) {
        return adminService.listUsers(role, status);
    }

    @PatchMapping("/users/{id}/suspend")
    public AdminUserResponse suspendUser(@PathVariable Long id) {
        return adminService.suspendUser(id);
    }

    @PatchMapping("/users/{id}/unsuspend")
    public AdminUserResponse unsuspendUser(@PathVariable Long id) {
        return adminService.unsuspendUser(id);
    }
}
