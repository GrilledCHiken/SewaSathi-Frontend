package com.sewasathi.controller;

import com.sewasathi.dto.request.ChangePasswordRequest;
import com.sewasathi.dto.request.UpdateProfileRequest;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.security.UserPrincipal;
import com.sewasathi.service.AuthService;
import com.sewasathi.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * The signed-in user's own account, whatever their role.
 *
 * <p>Every route here acts on {@code principal.getUsername()} - the email inside the
 * verified JWT - so there is no id in any path for a caller to swap for someone else's.
 * Nothing under {@code /api/users} is role-restricted in {@code SecurityConfig}: customers,
 * workers, and admins all manage their profile through exactly these endpoints.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.getCurrentUser(principal.getUsername());
    }

    @PatchMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal UserPrincipal principal,
                                 @Valid @RequestBody UpdateProfileRequest request) {
        return userProfileService.updateProfile(principal.getUsername(), request);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadAvatar(@AuthenticationPrincipal UserPrincipal principal,
                                     @RequestParam("photo") MultipartFile photo) {
        return userProfileService.updateAvatar(principal.getUsername(), photo);
    }

    @DeleteMapping("/me/avatar")
    public UserResponse removeAvatar(@AuthenticationPrincipal UserPrincipal principal) {
        return userProfileService.removeAvatar(principal.getUsername());
    }

    /**
     * Answers 204 rather than a fresh token pair. Changing the password revokes every
     * refresh token for the account, so there is no session left to hand back - the client
     * sends the user to sign in again.
     */
    @PostMapping("/me/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changePassword(principal.getUsername(), request);
        return ResponseEntity.noContent().build();
    }
}
