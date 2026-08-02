package com.sewasathi.service;

import com.sewasathi.config.ContactProperties;
import com.sewasathi.dto.response.CategoryRatingRow;
import com.sewasathi.dto.response.CategoryStatsRow;
import com.sewasathi.dto.response.PublicContactInfoResponse;
import com.sewasathi.dto.response.PublicOpenTaskResponse;
import com.sewasathi.dto.response.PublicServiceResponse;
import com.sewasathi.dto.response.PublicStatsResponse;
import com.sewasathi.dto.response.PublicTestimonialResponse;
import com.sewasathi.dto.response.TestimonialRow;
import com.sewasathi.dto.response.WorkerSkillRow;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.repository.ReviewRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Everything the logged-out marketing pages display, counted from the database.
 *
 * <p>These pages previously carried invented figures - 50,000 customers, 45 cities, a 98%
 * satisfaction rate that a second page contradicted with 90%. Each number now has exactly one
 * definition, stated here, and is published as counted. Nothing is floored or padded: a platform
 * with three workers says three.
 *
 * <p>Everything is read-only and anonymous, which sets the boundary on what these methods may
 * return. Aggregates are safe; identities are not. The one place personal data comes close to
 * the wire - a quoted review - is masked by {@link #maskName} before it leaves.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicDataService {

    /** A review must score at least this to be quotable, and to count towards satisfaction. */
    private static final int POSITIVE_RATING = 4;

    /** Upper bound on any {@code limit} query parameter, so a caller cannot ask for the table. */
    private static final int MAX_LIMIT = 12;

    private static final int DEFAULT_LIMIT = 3;

    /** Stands in for a reviewer whose account has no usable name. */
    private static final String ANONYMOUS_AUTHOR = "SewaSathi customer";

    private final UserRepository userRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final TaskRepository taskRepository;
    private final ReviewRepository reviewRepository;
    private final ContactProperties contactProperties;

    /** The headline counters shared by Home, How It Works, Safety and About Us. */
    public PublicStatsResponse getStats() {
        long reviewCount = reviewRepository.count();
        List<String> cities = taskRepository.distinctCities();

        return new PublicStatsResponse(
                userRepository.countByRoleAndStatusAndSuspendedFalse(Role.WORKER, ApprovalStatus.APPROVED),
                userRepository.countByRole(Role.CUSTOMER),
                taskRepository.count(),
                taskRepository.countByStatus(TaskStatus.COMPLETED),
                taskRepository.countByStatus(TaskStatus.OPEN),
                reviewCount,
                reviewRepository.averageRating(),
                satisfactionRate(reviewCount),
                cities.size(),
                cities,
                ServiceCategories.ORDERED.size());
    }

    /**
     * The share of reviews scoring {@value #POSITIVE_RATING} or better, as a whole percent.
     *
     * <p>Null rather than zero when nothing has been reviewed - the difference between "no one
     * has said" and "no one is satisfied" is the whole point of publishing the figure.
     */
    private Integer satisfactionRate(long reviewCount) {
        if (reviewCount == 0) {
            return null;
        }
        long positive = reviewRepository.countByRatingGreaterThanEqual(POSITIVE_RATING);
        return (int) Math.round(positive * 100.0 / reviewCount);
    }

    /**
     * The service catalogue, one row per category, with live demand and pricing.
     *
     * <p>Driven by {@link ServiceCategories#ORDERED} rather than by what the tasks table happens
     * to contain, so a category nobody has booked still appears - with zeroes. A catalogue that
     * silently dropped its quiet categories would shrink as the demo database changed.
     */
    public List<PublicServiceResponse> listServices() {
        Map<String, CategoryStatsRow> stats = taskRepository.categoryStats().stream()
                .filter(row -> row.getCategory() != null)
                .collect(Collectors.toMap(
                        row -> row.getCategory().toLowerCase(Locale.ROOT),
                        Function.identity(),
                        (first, second) -> first));

        Map<String, CategoryRatingRow> ratings = reviewRepository.ratingsByCategory().stream()
                .filter(row -> row.getCategory() != null)
                .collect(Collectors.toMap(
                        row -> row.getCategory().toLowerCase(Locale.ROOT),
                        Function.identity(),
                        (first, second) -> first));

        List<WorkerSkillRow> workers = workerProfileRepository.availableWorkerSkills();

        return ServiceCategories.ORDERED.stream()
                .map(category -> buildService(category, stats, ratings, workers))
                .toList();
    }

    private PublicServiceResponse buildService(
            String category,
            Map<String, CategoryStatsRow> stats,
            Map<String, CategoryRatingRow> ratings,
            List<WorkerSkillRow> workers) {

        String key = category.toLowerCase(Locale.ROOT);
        CategoryStatsRow taskStats = stats.get(key);
        CategoryRatingRow rating = ratings.get(key);

        // WorkerProfile.skills is free text, so the match happens here rather than in SQL -
        // the same in-memory approach WorkerService.listAvailableWorkers already uses for its
        // skill filter. A worker only counts towards a category they actually name, so someone
        // who wrote "Moving" is not counted under "Moving Help".
        List<WorkerSkillRow> matching = workers.stream()
                .filter(worker -> worker.getSkills() != null
                        && worker.getSkills().toLowerCase(Locale.ROOT).contains(key))
                .toList();

        BigDecimal startingRate = matching.stream()
                .map(WorkerSkillRow::getHourlyRate)
                .filter(rate -> rate != null && rate.signum() > 0)
                .min(BigDecimal::compareTo)
                .orElse(null);

        return new PublicServiceResponse(
                category,
                taskStats != null ? taskStats.getTaskCount() : 0L,
                taskStats != null ? taskStats.getCompletedCount() : 0L,
                matching.size(),
                rating != null ? rating.getRatingAverage() : null,
                rating != null ? rating.getRatingCount() : 0L,
                startingRate);
    }

    /**
     * Recent reviews worth quoting, with the reviewer's name masked.
     *
     * <p>Returns an empty list when nothing qualifies. The page hides its testimonial section in
     * that case, which is the honest alternative to the three invented reviews it used to show.
     */
    public List<PublicTestimonialResponse> listTestimonials(Integer limit) {
        return reviewRepository.publishableTestimonials(POSITIVE_RATING, Limit.of(clamp(limit))).stream()
                .map(PublicDataService::toTestimonial)
                .toList();
    }

    private static PublicTestimonialResponse toTestimonial(TestimonialRow row) {
        return new PublicTestimonialResponse(
                row.getComment(),
                maskName(row.getCustomerName()),
                row.getCity(),
                row.getRating(),
                row.getCreatedAt());
    }

    /**
     * "Sita Sharma" becomes "Sita S.".
     *
     * <p>Leaving a review is not consent to have your full name published to anonymous
     * visitors, so the surname is reduced to an initial before the quote goes out. A
     * single-word name is left as it is - there is nothing to shorten - and a missing one
     * falls back to a neutral label rather than rendering an empty byline.
     */
    static String maskName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return ANONYMOUS_AUTHOR;
        }

        String[] parts = fullName.trim().split("\\s+");
        String first = parts[0];
        if (parts.length == 1) {
            return first;
        }

        String surname = parts[parts.length - 1];
        return first + " " + Character.toUpperCase(surname.charAt(0)) + ".";
    }

    /** A sample of unclaimed work, for the "become a tasker" panel. */
    public List<PublicOpenTaskResponse> listOpenTasks(Integer limit) {
        return taskRepository.findByStatusOrderByCreatedAtDesc(TaskStatus.OPEN, Limit.of(clamp(limit))).stream()
                .map(task -> new PublicOpenTaskResponse(
                        task.getTitle(),
                        task.getCategory(),
                        task.getCity(),
                        task.getBudget(),
                        task.getCreatedAt()))
                .toList();
    }

    public PublicContactInfoResponse getContactInfo() {
        return new PublicContactInfoResponse(
                contactProperties.getSupportEmail(),
                contactProperties.getPhone(),
                contactProperties.getPhoneHref(),
                contactProperties.getAddress(),
                contactProperties.getHours(),
                contactProperties.getCareersEmail());
    }

    /** Keeps a caller-supplied limit inside {@code 1..}{@value #MAX_LIMIT}. */
    private static int clamp(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.clamp(limit, 1, MAX_LIMIT);
    }
}
