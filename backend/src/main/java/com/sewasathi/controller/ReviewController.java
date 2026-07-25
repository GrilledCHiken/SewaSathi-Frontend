package com.sewasathi.controller;

import com.sewasathi.dto.request.CreateReviewRequest;
import com.sewasathi.dto.response.ReviewResponse;
import com.sewasathi.dto.response.ReviewableTaskResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateReviewRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.createReview(principal.getUsername(), request));
    }

    @GetMapping("/mine")
    public List<ReviewResponse> myReviews(@AuthenticationPrincipal UserPrincipal principal) {
        return reviewService.listMyReviews(principal.getUsername());
    }

    @GetMapping("/reviewable-tasks")
    public List<ReviewableTaskResponse> reviewableTasks(@AuthenticationPrincipal UserPrincipal principal) {
        return reviewService.listReviewableTasks(principal.getUsername());
    }
}
