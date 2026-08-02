package com.sewasathi.repository;

import com.sewasathi.dto.response.CategoryRatingRow;
import com.sewasathi.dto.response.TestimonialRow;
import com.sewasathi.entity.Review;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByTaskId(Long taskId);
    Optional<Review> findByTaskId(Long taskId);
    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Review> findByWorkerIdOrderByCreatedAtDesc(Long workerId);

    /**
     * The platform-wide average score, or null when nothing has been reviewed yet.
     *
     * <p>The null is deliberate and is carried all the way to the browser: an unreviewed
     * platform has no average rating, and printing 0.0 would read as unanimously terrible
     * rather than as absent.
     */
    @Query("select avg(r.rating) from Review r")
    Double averageRating();

    /** Reviews at or above a score - the numerator of the satisfaction rate. */
    long countByRatingGreaterThanEqual(int rating);

    /**
     * Average score per service category, for the public catalogue. Categories with no reviews
     * are absent rather than zero; {@link com.sewasathi.service.PublicDataService} leaves their
     * rating null.
     */
    @Query("""
            select new com.sewasathi.dto.response.CategoryRatingRow(
                t.category, avg(r.rating), count(r))
            from Review r join r.task t
            group by t.category
            """)
    List<CategoryRatingRow> ratingsByCategory();

    /**
     * The newest reviews fit to quote publicly: a strong score and something actually written.
     *
     * <p>The reviewer's full name comes back here but never leaves the service unmasked - see
     * {@link com.sewasathi.dto.response.TestimonialRow}.
     */
    @Query("""
            select new com.sewasathi.dto.response.TestimonialRow(
                r.comment, c.fullName, t.city, r.rating, r.createdAt)
            from Review r join r.task t join r.customer c
            where r.rating >= :minRating and r.comment is not null and trim(r.comment) <> ''
            order by r.createdAt desc
            """)
    List<TestimonialRow> publishableTestimonials(@Param("minRating") int minRating, Limit limit);
}
