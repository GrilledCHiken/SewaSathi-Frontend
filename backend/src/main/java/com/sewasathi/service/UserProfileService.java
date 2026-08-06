package com.sewasathi.service;

import com.sewasathi.dto.request.ChangePasswordRequest;
import com.sewasathi.dto.request.UpdateProfileRequest;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.exception.InvalidCredentialsException;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Everything a signed-in user can change about their own account: display details, profile
 * photo, and password.
 *
 * <p>Separate from {@link AuthService}, which is about establishing a session rather than
 * maintaining the account behind it. Every method here resolves the account from the
 * authenticated principal's email and never from a client-supplied id, so one user cannot
 * reach another's profile whatever they put in the request body.
 */
@Service
@RequiredArgsConstructor
public class UserProfileService {

    /**
     * Profile pictures are images only. {@link FileStorageService} also accepts PDFs and
     * office documents because it backs identity-document uploads and chat attachments; an
     * avatar has no reason to be either, and the browser is going to render whatever is
     * stored here as an image.
     */
    private static final List<String> ALLOWED_AVATAR_TYPES =
            List.of("image/jpeg", "image/png", "image/gif", "image/webp");

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @Transactional(readOnly = true)
    public UserResponse getProfile(String email) {
        return UserResponse.from(requireUser(email));
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = requireUser(email);
        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone().trim());
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Replaces the profile picture, discarding whatever was there before.
     *
     * <p>The previous file is deleted only after the new one is stored and the row is saved:
     * a failure part-way through leaves an orphaned upload on disk, which is harmless, rather
     * than a row pointing at a file that no longer exists.
     */
    @Transactional
    public UserResponse updateAvatar(String email, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new InvalidOperationException("No photo was provided");
        }
        String contentType = photo.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType)) {
            throw new InvalidOperationException(
                    "A profile photo must be a JPEG, PNG, GIF, or WebP image");
        }

        User user = requireUser(email);
        String previousUrl = user.getAvatarUrl();

        FileStorageService.StoredFile stored = fileStorageService.store(photo);
        user.setAvatarUrl(stored.url());
        user = userRepository.save(user);
        mirrorOntoWorkerProfile(user);

        deleteIfUnreferenced(previousUrl);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse removeAvatar(String email) {
        User user = requireUser(email);
        String previousUrl = user.getAvatarUrl();
        if (previousUrl == null) {
            return UserResponse.from(user);
        }

        user.setAvatarUrl(null);
        user = userRepository.save(user);
        mirrorOntoWorkerProfile(user);

        deleteIfUnreferenced(previousUrl);
        return UserResponse.from(user);
    }

    /**
     * Changes the password and ends every session for the account, including this one.
     *
     * <p>A password change is how someone reacts to thinking their account is compromised,
     * so it would be self-defeating to leave the intruder's existing tokens working. The
     * client signs the user back in afterwards.
     */
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = requireUser(email);

        // An account created through Google has no current password to check. Without this the
        // encoder would simply not match and the user would be told their password is wrong,
        // which is both untrue and unactionable.
        if (user.getPasswordHash() == null) {
            throw new InvalidOperationException(
                    "This account signs in with Google, so it has no password to change");
        }

        // Reported as a 400, not a 401: the caller's session is perfectly valid, and the
        // client treats a 401 as an expired token and signs the user out - which is not what
        // a mistyped password should do.
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidOperationException("Your current password is not correct");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new InvalidOperationException("Your new password must differ from the current one");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        refreshTokenService.revokeAllForUser(user.getId());
    }

    /**
     * Keeps {@code worker_profiles.profile_photo_url} in step with the account's avatar.
     *
     * <p>The worker listing and the verification queue read the photo off the profile row,
     * and the verification upload still writes it there. Mirroring on save means both places
     * show the same picture without either having to know about the other.
     */
    private void mirrorOntoWorkerProfile(User user) {
        if (user.getRole() != Role.WORKER) {
            return;
        }
        workerProfileRepository.findByUserId(user.getId()).ifPresent(profile -> {
            profile.setProfilePhotoUrl(user.getAvatarUrl());
            workerProfileRepository.save(profile);
        });
    }

    /**
     * Deletes a replaced avatar unless a worker's verification submission also points at it,
     * in which case removing the file would blank the photo an admin is reviewing.
     */
    private void deleteIfUnreferenced(String url) {
        if (url == null) {
            return;
        }
        if (workerProfileRepository.findByProfilePhotoUrl(url).isEmpty()) {
            fileStorageService.delete(url);
        }
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);
    }
}
