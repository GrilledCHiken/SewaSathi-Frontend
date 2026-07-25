package com.sewasathi.controller;

import com.sewasathi.dto.response.DashboardSummaryResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TaskService taskService;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary(@AuthenticationPrincipal UserPrincipal principal) {
        return taskService.getDashboardSummary(principal.getUsername());
    }
}
