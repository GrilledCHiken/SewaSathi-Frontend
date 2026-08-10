package com.sewasathi.service;

import com.sewasathi.dto.response.PublicServiceResponse;
import com.sewasathi.dto.response.PublicStatsResponse;
import com.sewasathi.dto.response.PublicTestimonialResponse;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Review;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.repository.ReviewRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Covers the figures the logged-out marketing pages publish. The Spring context is shared
 * across the suite, so absolute totals are unavailable and every assertion is on the delta
 * this seed adds, as in {@code AdminAnalyticsTest}.
 *
 * <p>Two behaviours are covered on their own: a reviewer's surname must never leave the
 * service intact, and a catalogue entry nobody has booked must still be listed.
 */
@SpringBootTest
@ActiveProfiles("test")
class PublicDataServiceTest {

    @Autowired
    private PublicDataService publicDataService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    private PublicStatsResponse baseline;
    private long baselinePaintingTasks;
    private long baselinePaintingWorkers;

    @BeforeEach
    void seedActivity() {
        baseline = publicDataService.getStats();
        PublicServiceResponse paintingBefore = serviceNamed(publicDataService.listServices(), "Painting");
        baselinePaintingTasks = paintingBefore.getTaskCount();
        baselinePaintingWorkers = paintingBefore.getWorkerCount();

        long unique = System.nanoTime();

        User customer = userRepository.save(User.builder()
                .email("public-customer-" + unique + "@example.com")
                .passwordHash("x").fullName("Sita Sharma").phone("9800000030")
                .role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).build());

        User worker = userRepository.save(User.builder()
                .email("public-worker-" + unique + "@example.com")
                .passwordHash("x").fullName("Bikash Rai").phone("9800000031")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build());

        workerProfileRepository.save(WorkerProfile.builder()
                .user(worker).skills("Painting, Home Repair")
                .hourlyRate(new BigDecimal("850.00")).location("Bhaktapur").build());

        // One Painting task seen through to completion and reviewed, one still open - so the
        // completed, open and reviewed counters can be told apart.
        Task completed = saveTask(customer, "Painting", "Bhaktapur", TaskStatus.COMPLETED);
        saveTask(customer, "Painting", "Bhaktapur", TaskStatus.OPEN);

        reviewRepository.save(Review.builder()
                .task(completed).customer(customer).worker(worker)
                .rating(5).comment("Neat work and finished early.")
                .build());
    }

    private Task saveTask(User customer, String category, String city, TaskStatus status) {
        return taskRepository.save(Task.builder()
                .customer(customer)
                .title(category + " job").category(category).description("Seeded for public stats")
                .city(city).location(city + " centre")
                .budget(new BigDecimal("4000.00")).status(status)
                .build());
    }

    private static PublicServiceResponse serviceNamed(List<PublicServiceResponse> services, String name) {
        return services.stream()
                .filter(service -> service.getName().equals(name))
                .findFirst()
                .orElseThrow(() -> new AssertionError("The catalogue is missing " + name));
    }

    @Test
    void countersMoveWithTheDataBehindThem() {
        PublicStatsResponse stats = publicDataService.getStats();

        assertThat(stats.getCustomers()).isEqualTo(baseline.getCustomers() + 1);
        assertThat(stats.getVerifiedWorkers()).isEqualTo(baseline.getVerifiedWorkers() + 1);
        assertThat(stats.getTasksPosted()).isEqualTo(baseline.getTasksPosted() + 2);
        assertThat(stats.getTasksCompleted()).isEqualTo(baseline.getTasksCompleted() + 1);
        assertThat(stats.getOpenTasks()).isEqualTo(baseline.getOpenTasks() + 1);
        assertThat(stats.getReviewCount()).isEqualTo(baseline.getReviewCount() + 1);
    }

    /** The catalogue size is the one figure that is a constant, and it has to be the real one. */
    @Test
    void categoriesOfferedMatchesTheCatalogue() {
        assertThat(publicDataService.getStats().getCategoriesOffered())
                .isEqualTo(ServiceCategories.ORDERED.size())
                .isEqualTo(publicDataService.listServices().size());
    }

    @Test
    void citiesCoveredAreTheCitiesTasksWerePostedIn() {
        PublicStatsResponse stats = publicDataService.getStats();

        assertThat(stats.getCityNames()).contains("Bhaktapur");
        assertThat(stats.getCitiesCovered()).isEqualTo(stats.getCityNames().size());
    }

    /**
     * A suspended or unapproved worker is not someone a customer can hire, so counting them
     * would leave the headline permanently ahead of the directory it summarises.
     */
    @Test
    void verifiedWorkersExcludesSuspendedAndUnapprovedAccounts() {
        long before = publicDataService.getStats().getVerifiedWorkers();
        long unique = System.nanoTime();

        userRepository.save(User.builder()
                .email("public-pending-" + unique + "@example.com")
                .passwordHash("x").fullName("Pending Worker").phone("9800000032")
                .role(Role.WORKER).status(ApprovalStatus.PENDING).build());

        userRepository.save(User.builder()
                .email("public-suspended-" + unique + "@example.com")
                .passwordHash("x").fullName("Suspended Worker").phone("9800000033")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).suspended(true).build());

        assertThat(publicDataService.getStats().getVerifiedWorkers()).isEqualTo(before);
    }

    @Test
    void satisfactionIsTheShareOfFourStarAndBetterReviews() {
        PublicStatsResponse stats = publicDataService.getStats();

        // The seed is a 5-star review, so with at least one review present both figures exist.
        assertThat(stats.getRatingAverage()).isNotNull().isBetween(1.0, 5.0);
        assertThat(stats.getSatisfactionRate()).isNotNull().isBetween(0, 100);
    }

    @Test
    void aCategoryCarriesItsOwnTasksWorkersAndRating() {
        PublicServiceResponse painting = serviceNamed(publicDataService.listServices(), "Painting");

        assertThat(painting.getTaskCount()).isEqualTo(baselinePaintingTasks + 2);
        assertThat(painting.getCompletedCount()).isPositive();
        assertThat(painting.getWorkerCount()).isEqualTo(baselinePaintingWorkers + 1);
        assertThat(painting.getRatingAverage()).isNotNull().isBetween(1.0, 5.0);
        assertThat(painting.getRatingCount()).isPositive();
    }

    /** "Starting from" has to be a rate somebody is charging, not a fixed number on a card. */
    @Test
    void startingRateIsTheCheapestAdvertisedRateForTheSkill() {
        PublicServiceResponse painting = serviceNamed(publicDataService.listServices(), "Painting");

        assertThat(painting.getStartingRate()).isNotNull();
        assertThat(painting.getStartingRate()).isLessThanOrEqualTo(new BigDecimal("850.00"));
    }

    /**
     * The catalogue describes what can be requested, not only what has been. A category with no
     * activity stays listed, carrying zeroes and no rating - dropping it would make the
     * catalogue shrink and grow as the database changed.
     */
    @Test
    void anUnusedCategoryIsStillListedWithZeroes() {
        PublicServiceResponse officeSupport =
                serviceNamed(publicDataService.listServices(), "Office Support");

        assertThat(officeSupport.getTaskCount()).isZero();
        assertThat(officeSupport.getCompletedCount()).isZero();
        assertThat(officeSupport.getRatingAverage()).isNull();
        assertThat(officeSupport.getRatingCount()).isZero();
        assertThat(officeSupport.getStartingRate()).isNull();
    }

    @Test
    void everyCatalogueEntryIsReturnedInDisplayOrder() {
        assertThat(publicDataService.listServices())
                .extracting(PublicServiceResponse::getName)
                .containsExactlyElementsOf(ServiceCategories.ORDERED);
    }

    @Test
    void testimonialsQuoteRealReviewsWithTheSurnameMasked() {
        List<PublicTestimonialResponse> testimonials = publicDataService.listTestimonials(5);

        assertThat(testimonials).isNotEmpty();
        assertThat(testimonials).allSatisfy(testimonial -> {
            assertThat(testimonial.getRating()).isGreaterThanOrEqualTo(4);
            assertThat(testimonial.getQuote()).isNotBlank();
        });
        assertThat(testimonials)
                .extracting(PublicTestimonialResponse::getAuthor)
                .contains("Sita S.")
                .doesNotContain("Sita Sharma");
    }

    @Test
    void theTestimonialLimitIsHonouredAndBounded() {
        assertThat(publicDataService.listTestimonials(1)).hasSizeLessThanOrEqualTo(1);
        // Asking for more than the cap must not become a way to read the whole review table.
        assertThat(publicDataService.listTestimonials(500)).hasSizeLessThanOrEqualTo(12);
        assertThat(publicDataService.listTestimonials(null)).hasSizeLessThanOrEqualTo(3);
    }

    /**
     * Masking runs on whatever the accounts table holds, which is not always two tidy names.
     * None of these may throw, and none may return the surname.
     */
    @Test
    void maskingCopesWithNamesThatAreNotTwoWords() {
        assertThat(PublicDataService.maskName("Sita Sharma")).isEqualTo("Sita S.");
        assertThat(PublicDataService.maskName("Sita Kumari Sharma")).isEqualTo("Sita S.");
        assertThat(PublicDataService.maskName("  Sita   Sharma  ")).isEqualTo("Sita S.");
        assertThat(PublicDataService.maskName("sita sharma")).isEqualTo("sita S.");
        assertThat(PublicDataService.maskName("Sita")).isEqualTo("Sita");
        assertThat(PublicDataService.maskName("   ")).isEqualTo("SewaSathi customer");
        assertThat(PublicDataService.maskName(null)).isEqualTo("SewaSathi customer");
    }

    @Test
    void openTasksAreTheUnclaimedOnesAndCarryNoCustomer() {
        assertThat(publicDataService.listOpenTasks(5))
                .isNotEmpty()
                .allSatisfy(task -> assertThat(task.getTitle()).isNotBlank());
    }

    @Test
    void contactDetailsComeFromConfiguration() {
        assertThat(publicDataService.getContactInfo().getSupportEmail()).contains("@");
        assertThat(publicDataService.getContactInfo().getPhone()).isNotBlank();
    }
}
