package com.sewasathi.controller;

import com.sewasathi.dto.response.TaskResponse;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/worker/tasks")
@RequiredArgsConstructor
public class WorkerTaskController {

    private final TaskService taskService;

    @GetMapping("/open")
    public List<TaskResponse> openTasks() {
        return taskService.listOpenTasks();
    }

    @GetMapping("/mine")
    public List<TaskResponse> myJobs(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) TaskStatus status
    ) {
        return taskService.listMyJobs(principal.getUsername(), status);
    }

    @PatchMapping("/{id}/accept")
    public TaskResponse accept(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return taskService.acceptTask(id, principal.getUsername());
    }

    @PatchMapping("/{id}/start")
    public TaskResponse start(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return taskService.startTask(id, principal.getUsername());
    }

    @PatchMapping("/{id}/complete")
    public TaskResponse complete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return taskService.completeTask(id, principal.getUsername());
    }
}
