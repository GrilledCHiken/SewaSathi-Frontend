package com.sewasathi.repository;

import com.sewasathi.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByTaskId(Long taskId);
    Optional<Review> findByTaskId(Long taskId);
    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Review> findByWorkerIdOrderByCreatedAtDesc(Long workerId);
}
