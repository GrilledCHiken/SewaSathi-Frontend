package com.sewasathi.controller;

import com.sewasathi.dto.response.PublicContactInfoResponse;
import com.sewasathi.dto.response.PublicOpenTaskResponse;
import com.sewasathi.dto.response.PublicServiceResponse;
import com.sewasathi.dto.response.PublicStatsResponse;
import com.sewasathi.dto.response.PublicTestimonialResponse;
import com.sewasathi.service.PublicDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only figures for the marketing pages, reachable without signing in.
 *
 * <p>Everything the public pages need used to be either hardcoded in the React source or locked
 * behind a role - {@code GET /api/workers} needs CUSTOMER, the analytics dashboard needs ADMIN -
 * so a visitor could be shown numbers but never real ones. This controller is the narrow opening
 * that fixes that.
 *
 * <p>It is deliberately the only anonymous read surface in the API, and every method on it
 * returns aggregates or already-anonymised rows. Nothing here takes an id, and nothing here can
 * be made to return a particular person's record. {@code SecurityConfig} permits GET on this
 * path only.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final PublicDataService publicDataService;

    @GetMapping("/stats")
    public ResponseEntity<PublicStatsResponse> stats() {
        return ResponseEntity.ok(publicDataService.getStats());
    }

    @GetMapping("/services")
    public ResponseEntity<List<PublicServiceResponse>> services() {
        return ResponseEntity.ok(publicDataService.listServices());
    }

    @GetMapping("/testimonials")
    public ResponseEntity<List<PublicTestimonialResponse>> testimonials(
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(publicDataService.listTestimonials(limit));
    }

    @GetMapping("/open-tasks")
    public ResponseEntity<List<PublicOpenTaskResponse>> openTasks(
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(publicDataService.listOpenTasks(limit));
    }

    @GetMapping("/contact-info")
    public ResponseEntity<PublicContactInfoResponse> contactInfo() {
        return ResponseEntity.ok(publicDataService.getContactInfo());
    }
}
