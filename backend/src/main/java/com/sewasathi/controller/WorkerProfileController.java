package com.sewasathi.controller;

import com.sewasathi.dto.request.UpdateWorkerProfileRequest;
import com.sewasathi.dto.response.WorkerSummaryResponse;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.FileStorageService;
import com.sewasathi.service.WorkerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/worker/profile")
@RequiredArgsConstructor
public class WorkerProfileController {

    private final WorkerService workerService;
    private final FileStorageService fileStorageService;

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

    @PostMapping(value = "/verification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public WorkerSummaryResponse submitVerification(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String fullName,
            @RequestParam String phone,
            @RequestParam String city,
            @RequestParam String address,
            @RequestParam(required = false) String skills,
            @RequestParam(required = false) String yearsOfExperience,
            @RequestParam(required = false) BigDecimal hourlyRate,
            @RequestParam(required = false) String bio,
            @RequestParam(value = "policeClearance", required = false) MultipartFile policeClearance,
            @RequestParam(value = "citizenshipDoc", required = false) MultipartFile citizenshipDoc,
            @RequestParam(value = "profilePhoto", required = false) MultipartFile profilePhoto
    ) {
        if (policeClearance == null || policeClearance.isEmpty()) {
            throw new InvalidOperationException("A police clearance report is required for verification");
        }
        if (citizenshipDoc == null || citizenshipDoc.isEmpty()) {
            throw new InvalidOperationException("A citizenship/ID document is required for verification");
        }

        FileStorageService.StoredFile policeClearanceFile = fileStorageService.store(policeClearance);
        FileStorageService.StoredFile citizenshipFile = fileStorageService.store(citizenshipDoc);
        FileStorageService.StoredFile profilePhotoFile =
                (profilePhoto != null && !profilePhoto.isEmpty()) ? fileStorageService.store(profilePhoto) : null;

        return workerService.submitVerification(
                principal.getUsername(),
                fullName,
                phone,
                city,
                address,
                skills,
                yearsOfExperience,
                hourlyRate,
                bio,
                policeClearanceFile.url(),
                citizenshipFile.url(),
                profilePhotoFile != null ? profilePhotoFile.url() : null
        );
    }
}
