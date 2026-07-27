package com.sewasathi.controller;

import com.sewasathi.dto.response.AdminOverviewResponse;
import com.sewasathi.dto.response.AdminUserResponse;
import com.sewasathi.dto.response.ErrorResponse;
import com.sewasathi.dto.response.PendingWorkerResponse;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.service.AdminService;
import com.sewasathi.service.ReportService;
import com.sewasathi.service.ReportType;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ReportService reportService;

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

    /** The reports the SPA can offer, so its Analytics page is not a hardcoded list. */
    @GetMapping("/reports")
    public List<Map<String, Object>> availableReports() {
        return Arrays.stream(ReportType.values())
                .map(type -> Map.<String, Object>of(
                        "slug", type.getSlug(),
                        "title", type.getTitle(),
                        "dateRanged", type.isDateRanged()))
                .toList();
    }

    /**
     * Generates a report as a download (requirement #14). The SPA counterpart of
     * {@code /admin/reports/{slug}} on the server-rendered console - same service, same
     * templates, different authentication.
     */
    @GetMapping("/reports/{slug}")
    public ResponseEntity<byte[]> downloadReport(
            @PathVariable String slug,
            @RequestParam(defaultValue = "pdf") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        ReportType type = ReportType.fromSlug(slug);
        ReportService.Format outputFormat = ReportService.Format.fromString(format);
        LocalDate start = from != null ? from : LocalDate.now().minusYears(1);
        LocalDate end = to != null ? to : LocalDate.now();

        byte[] body = reportService.generate(type, outputFormat, start, end);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(outputFormat.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(reportService.fileName(type, outputFormat))
                                .build().toString())
                // The SPA downloads this over XHR, so it has to be allowed to read the
                // header that carries the filename.
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .body(body);
    }

    /** An unknown report slug or format is a bad request, not a server error. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleUnknownReport(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }
}
