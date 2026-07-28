package com.sewasathi.service;

import com.sewasathi.dto.request.ChangePasswordRequest;
import com.sewasathi.dto.request.UpdateProfileRequest;
import com.sewasathi.dto.response.UserResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the account-management surface behind "My Profile".
 *
 * <p>The password tests are the ones that matter: they pin the two rules that make an
 * in-session password change safe rather than an account-takeover primitive - the current
 * password must be presented, and every existing session dies with the old password.
 */
@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private WorkerProfileRepository workerProfileRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private RefreshTokenService refreshTokenService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private UserProfileService service;
    private User customer;

    private static final String CURRENT_PASSWORD = "Str0ng!Pass";

    @BeforeEach
    void setUp() {
        service = new UserProfileService(userRepository, workerProfileRepository,
                fileStorageService, passwordEncoder, refreshTokenService);

        customer = User.builder()
                .id(1L)
                .email("customer@example.com")
                .passwordHash(passwordEncoder.encode(CURRENT_PASSWORD))
                .fullName("Old Name")
                .phone("9800000000")
                .role(Role.CUSTOMER)
                .status(ApprovalStatus.APPROVED)
                .build();

        lenient().when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static UpdateProfileRequest profileRequest(String fullName, String phone) {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName(fullName);
        request.setPhone(phone);
        return request;
    }

    private static ChangePasswordRequest passwordRequest(String current, String next) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(current);
        request.setNewPassword(next);
        return request;
    }

    // --- Details ---

    @Test
    void updateProfile_savesTrimmedNameAndPhone() {
        UserResponse response = service.updateProfile(customer.getEmail(),
                profileRequest("  New Name  ", "9812345678"));

        assertThat(response.getFullName()).isEqualTo("New Name");
        assertThat(response.getPhone()).isEqualTo("9812345678");
    }

    @Test
    void updateProfile_cannotChangeEmailOrRole() {
        service.updateProfile(customer.getEmail(), profileRequest("New Name", "9812345678"));

        // The DTO carries no field for either, which is the point - both are outside what a
        // user may edit about themselves.
        assertThat(customer.getEmail()).isEqualTo("customer@example.com");
        assertThat(customer.getRole()).isEqualTo(Role.CUSTOMER);
    }

    // --- Avatar ---

    @Test
    void updateAvatar_storesTheFileAndDeletesTheOldOne() {
        customer.setAvatarUrl("/uploads/old.png");
        when(fileStorageService.store(any())).thenReturn(
                new FileStorageService.StoredFile("/uploads/new.png", "me.png", "image/png"));
        when(workerProfileRepository.findByProfilePhotoUrl("/uploads/old.png")).thenReturn(Optional.empty());

        UserResponse response = service.updateAvatar(customer.getEmail(), imageFile("image/png"));

        assertThat(response.getAvatarUrl()).isEqualTo("/uploads/new.png");
        verify(fileStorageService).delete("/uploads/old.png");
    }

    @Test
    void updateAvatar_rejectsANonImage() {
        MockMultipartFile pdf = new MockMultipartFile("photo", "cv.pdf", "application/pdf", new byte[] {1, 2, 3, 4});

        // FileStorageService itself accepts PDFs - it also backs document uploads - so the
        // narrower rule has to live here or an avatar could be a PDF.
        assertThatThrownBy(() -> service.updateAvatar(customer.getEmail(), pdf))
                .isInstanceOf(InvalidOperationException.class);
        verify(fileStorageService, never()).store(any());
    }

    @Test
    void updateAvatar_mirrorsOntoTheWorkerProfile() {
        User worker = User.builder().id(2L).email("worker@example.com")
                .passwordHash(customer.getPasswordHash()).fullName("Worker").phone("9800000001")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build();
        WorkerProfile profile = WorkerProfile.builder().id(9L).user(worker).build();

        when(userRepository.findByEmail(worker.getEmail())).thenReturn(Optional.of(worker));
        when(fileStorageService.store(any())).thenReturn(
                new FileStorageService.StoredFile("/uploads/new.png", "me.png", "image/png"));
        when(workerProfileRepository.findByUserId(worker.getId())).thenReturn(Optional.of(profile));

        service.updateAvatar(worker.getEmail(), imageFile("image/png"));

        // The browse listing reads the photo off the profile row, so the two must agree.
        assertThat(profile.getProfilePhotoUrl()).isEqualTo("/uploads/new.png");
        verify(workerProfileRepository).save(profile);
    }

    @Test
    void removeAvatar_clearsTheColumnAndTheFile() {
        customer.setAvatarUrl("/uploads/old.png");
        when(workerProfileRepository.findByProfilePhotoUrl("/uploads/old.png")).thenReturn(Optional.empty());

        UserResponse response = service.removeAvatar(customer.getEmail());

        assertThat(response.getAvatarUrl()).isNull();
        verify(fileStorageService).delete("/uploads/old.png");
    }

    @Test
    void removeAvatar_onAnAccountWithoutOneIsANoOp() {
        service.removeAvatar(customer.getEmail());

        verify(fileStorageService, never()).delete(any());
    }

    // --- Password ---

    @Test
    void changePassword_reencodesAndRevokesEverySession() {
        service.changePassword(customer.getEmail(), passwordRequest(CURRENT_PASSWORD, "N3w!Password"));

        assertThat(passwordEncoder.matches("N3w!Password", customer.getPasswordHash())).isTrue();
        // A password change is how someone reacts to a suspected compromise; leaving the
        // old sessions alive would defeat it.
        verify(refreshTokenService).revokeAllForUser(customer.getId());
    }

    @Test
    void changePassword_refusesAWrongCurrentPassword() {
        assertThatThrownBy(() -> service.changePassword(customer.getEmail(),
                passwordRequest("NotMyPassword1!", "N3w!Password")))
                .isInstanceOf(InvalidOperationException.class);

        assertThat(passwordEncoder.matches(CURRENT_PASSWORD, customer.getPasswordHash())).isTrue();
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    void changePassword_refusesReusingTheSamePassword() {
        assertThatThrownBy(() -> service.changePassword(customer.getEmail(),
                passwordRequest(CURRENT_PASSWORD, CURRENT_PASSWORD)))
                .isInstanceOf(InvalidOperationException.class);

        // Otherwise "change your password" could be satisfied without changing anything,
        // while still signing every device out.
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    private static MockMultipartFile imageFile(String contentType) {
        return new MockMultipartFile("photo", "me.png", contentType, new byte[] {1, 2, 3, 4});
    }
}
