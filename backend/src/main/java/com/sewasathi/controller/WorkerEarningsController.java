package com.sewasathi.controller;

import com.sewasathi.dto.response.WorkerEarningsResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.WorkerEarningsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The worker's own earnings. Sits under {@code /api/worker}, which SecurityConfig already
 * restricts to {@code ROLE_WORKER}, and answers only for the authenticated caller - there is
 * no worker id to point at somebody else's money.
 */
@RestController
@RequestMapping("/api/worker/earnings")
@RequiredArgsConstructor
public class WorkerEarningsController {

    private final WorkerEarningsService workerEarningsService;

    @GetMapping
    public WorkerEarningsResponse myEarnings(@AuthenticationPrincipal UserPrincipal principal) {
        return workerEarningsService.getMyEarnings(principal.getUsername());
    }
}
