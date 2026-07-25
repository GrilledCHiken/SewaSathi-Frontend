package com.sewasathi.controller;

import com.sewasathi.dto.request.AssignWorkerRequest;
import com.sewasathi.dto.request.CreateTaskRequest;
import com.sewasathi.dto.response.DashboardSummaryResponse;
import com.sewasathi.dto.response.TaskResponse;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(principal.getUsername(), request));
    }

    @GetMapping("/mine")
    public List<TaskResponse> myTasks(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) TaskStatus status
    ) {
        return taskService.listMyTasks(principal.getUsername(), status);
    }

    @GetMapping("/{id}")
    public TaskResponse getTask(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return taskService.getTask(id, principal.getUsername());
    }

    @PatchMapping("/{id}/cancel")
    public TaskResponse cancelTask(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return taskService.cancelTask(id, principal.getUsername());
    }

    @PatchMapping("/{id}/assign")
    public TaskResponse assignWorker(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AssignWorkerRequest request
    ) {
        return taskService.assignWorker(id, principal.getUsername(), request.getWorkerId());
    }
}
