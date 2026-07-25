package com.sewasathi.service;

import com.sewasathi.dto.request.CreateReviewRequest;
import com.sewasathi.dto.response.ReviewResponse;
import com.sewasathi.dto.response.ReviewableTaskResponse;
import com.sewasathi.entity.Review;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.InvalidOperationException;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.ReviewRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;

    @Transactional
    public ReviewResponse createReview(String customerEmail, CreateReviewRequest request) {
        User customer = getUser(customerEmail);
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("No task with id " + request.getTaskId()));

        if (!task.getCustomer().getId().equals(customer.getId())) {
            throw new ResourceNotFoundException("No task with id " + request.getTaskId());
        }
        if (task.getStatus() != TaskStatus.COMPLETED) {
            throw new InvalidOperationException("Only completed tasks can be reviewed");
        }
        if (task.getAssignedWorker() == null) {
            throw new InvalidOperationException("This task has no assigned worker to review");
        }
        if (reviewRepository.existsByTaskId(task.getId())) {
            throw new InvalidOperationException("This task has already been reviewed");
        }

        User worker = task.getAssignedWorker();
        Review review = Review.builder()
                .task(task)
                .customer(customer)
                .worker(worker)
                .rating(request.getRating())
                .comment(request.getComment() != null ? request.getComment().trim() : null)
                .build();
        review = reviewRepository.save(review);

        applyRatingToWorkerProfile(worker.getId(), request.getRating());

        return ReviewResponse.from(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> listMyReviews(String customerEmail) {
        User customer = getUser(customerEmail);
        return reviewRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream()
                .map(ReviewResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewableTaskResponse> listReviewableTasks(String customerEmail) {
        User customer = getUser(customerEmail);
        return taskRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customer.getId(), TaskStatus.COMPLETED)
                .stream()
                .filter(task -> task.getAssignedWorker() != null)
                .filter(task -> !reviewRepository.existsByTaskId(task.getId()))
                .map(ReviewableTaskResponse::from)
                .toList();
    }

    private void applyRatingToWorkerProfile(Long workerId, int rating) {
        WorkerProfile profile = workerProfileRepository.findByUserId(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("No worker profile for user " + workerId));

        int previousCount = profile.getRatingCount() != null ? profile.getRatingCount() : 0;
        BigDecimal previousAverage = profile.getRatingAverage() != null ? profile.getRatingAverage() : BigDecimal.ZERO;

        BigDecimal previousTotal = previousAverage.multiply(BigDecimal.valueOf(previousCount));
        int newCount = previousCount + 1;
        BigDecimal newAverage = previousTotal.add(BigDecimal.valueOf(rating))
                .divide(BigDecimal.valueOf(newCount), 2, RoundingMode.HALF_UP);

        profile.setRatingCount(newCount);
        profile.setRatingAverage(newAverage);
        workerProfileRepository.save(profile);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No user with email " + email));
    }
}
