package com.sewasathi.service;

import com.sewasathi.dto.request.UpdateWorkerProfileRequest;
import com.sewasathi.dto.response.WorkerSummaryResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkerServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkerProfileRepository workerProfileRepository;

    @Mock
    private FileStorageService fileStorageService;

    private WorkerService workerService;

    private User worker;
    private WorkerProfile profile;

    @BeforeEach
    void setUp() {
        workerService = new WorkerService(userRepository, workerProfileRepository, fileStorageService);
        worker = User.builder()
                .id(5L).email("worker@example.com").fullName("Worker One")
                .phone("9800000005").role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(false)
                .build();
        profile = WorkerProfile.builder()
                .id(1L).user(worker).skills(null).hourlyRate(null).location(null).bio(null)
                .ratingAverage(BigDecimal.ZERO).ratingCount(0).tasksCompleted(0)
                .build();
        lenient().when(workerProfileRepository.save(any(WorkerProfile.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void getMyProfile_returnsCurrentSkillsAndRate() {
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        when(workerProfileRepository.findByUserId(5L)).thenReturn(Optional.of(profile));

        WorkerSummaryResponse response = workerService.getMyProfile("worker@example.com");

        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getSkills()).isNull();
    }

    @Test
    void updateMyProfile_setsSkillsRateLocationBio() {
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        when(workerProfileRepository.findByUserId(5L)).thenReturn(Optional.of(profile));

        UpdateWorkerProfileRequest request = new UpdateWorkerProfileRequest();
        request.setSkills("Cleaning, Plumbing");
        request.setHourlyRate(new BigDecimal("350"));
        request.setLocation("Kathmandu");
        request.setBio("Reliable and on time.");

        WorkerSummaryResponse response = workerService.updateMyProfile("worker@example.com", request);

        assertThat(response.getSkills()).isEqualTo("Cleaning, Plumbing");
        assertThat(response.getHourlyRate()).isEqualByComparingTo("350");
        assertThat(response.getLocation()).isEqualTo("Kathmandu");
        assertThat(response.getBio()).isEqualTo("Reliable and on time.");
    }

    @Test
    void getMyProfile_missingProfile_throwsResourceNotFound() {
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(worker));
        when(workerProfileRepository.findByUserId(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workerService.getMyProfile("worker@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
