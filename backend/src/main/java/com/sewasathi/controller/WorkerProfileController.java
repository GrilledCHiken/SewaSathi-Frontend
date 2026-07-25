package com.sewasathi.controller;

import com.sewasathi.dto.request.UpdateWorkerProfileRequest;
import com.sewasathi.dto.response.WorkerSummaryResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.WorkerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/worker/profile")
@RequiredArgsConstructor
public class WorkerProfileController {

    private final WorkerService workerService;

    @GetMapping
    public WorkerSummaryResponse myProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return workerService.getMyProfile(principal.getUsername());
    }

    @PatchMapping
    public WorkerSummaryResponse updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateWorkerProfileRequest request
    ) {
        return workerService.updateMyProfile(principal.getUsername(), request);
    }
}
