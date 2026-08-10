package com.sewasathi.service;

import com.sewasathi.dto.response.AdminAnalyticsResponse;
import com.sewasathi.dto.response.AnalyticsBreakdownRow;
import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.PaymentType;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Covers the figures behind the admin analytics dashboard: that they are read from the
 * database rather than fixed, that the date window actually filters them, and that an empty
 * window reads as zero instead of blowing up on null aggregates.
 *
 * <p>Rows are stamped by {@code @CreationTimestamp}, so the seed always lands in "today" -
 * the out-of-range assertions therefore use a window far in the past.
 */
@SpringBootTest
@ActiveProfiles("test")
class AdminAnalyticsTest {

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    private final LocalDate today = LocalDate.now();

    private long baselineTasks;
    private long baselineUsers;
    private BigDecimal baselineRevenue;
    private BigDecimal baselineFees;

    private User seededCustomer;
    private Task seededTask;
    private long seedId;

    @BeforeEach
    void seedActivity() {
        // The context is shared across tests, so assert on the delta this seed adds rather
        // than on absolute totals.
        AdminAnalyticsResponse before = adminService.getAnalytics(today.minusYears(1), today);
        baselineTasks = before.getTotalTasks();
        baselineUsers = before.getNewUsers();
        baselineRevenue = before.getTotalRevenue();
        baselineFees = before.getPlatformFees();

        long unique = System.nanoTime();
        seedId = unique;

        User customer = userRepository.save(User.builder()
                .email("analytics-customer-" + unique + "@example.com")
                .passwordHash("x").fullName("Analytics Customer").phone("9800000020")
                .role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).build());
        seededCustomer = customer;

        // Two Electrical tasks in Pokhara against one Cleaning task in Lalitpur, so the
        // "top" lists have something to actually rank.
        Task first = saveTask(customer, "Electrical", "Pokhara", "1000.00");
        saveTask(customer, "Electrical", "Pokhara", "2000.00");
        saveTask(customer, "Cleaning", "Lalitpur", "500.00");
        seededTask = first;

        // A settled advance and an abandoned one: only the settled one is money.
        savePayment(first, customer, "analytics-paid-" + unique, "100.00", "1000.00",
                PaymentType.ADVANCE, PaymentStatus.COMPLETED);
        savePayment(first, customer, "analytics-pending-" + unique, "200.00", "2000.00",
                PaymentType.ADVANCE, PaymentStatus.PENDING);
    }

    private Task saveTask(User customer, String category, String city, String budget) {
        return taskRepository.save(Task.builder()
                .customer(customer)
                .title(category + " job").category(category).description("Seeded for analytics")
                .city(city).location(city + " centre")
                .budget(new BigDecimal(budget)).status(TaskStatus.OPEN)
                .build());
    }

    private void savePayment(Task task, User customer, String uuid, String amount,
                             String taskTotal, PaymentType type, PaymentStatus status) {
        paymentRepository.save(Payment.builder()
                .task(task).customer(customer)
                .transactionUuid(uuid)
                .amount(new BigDecimal(amount)).taskTotal(new BigDecimal(taskTotal))
                .type(type).provider(PaymentProvider.ESEWA).status(status)
                .build());
    }

    @Test
    void countsTasksAndSignUpsInTheWindow() {
        AdminAnalyticsResponse analytics = adminService.getAnalytics(today.minusYears(1), today);

        assertThat(analytics.getTotalTasks()).isEqualTo(baselineTasks + 3);
        assertThat(analytics.getNewUsers()).isEqualTo(baselineUsers + 1);
    }

    /**
     * Revenue is the gross value of what settled and the fee is the advance taken on it, so a
     * payment left PENDING must not move either figure.
     */
    @Test
    void moneyCountsOnlySettledPayments() {
        AdminAnalyticsResponse analytics = adminService.getAnalytics(today.minusYears(1), today);

        assertThat(analytics.getTotalRevenue())
                .isEqualByComparingTo(baselineRevenue.add(new BigDecimal("1000.00")));
        assertThat(analytics.getPlatformFees())
                .isEqualByComparingTo(baselineFees.add(new BigDecimal("100.00")));
    }

    /**
     * A task is paid in two legs and both carry the same {@code taskTotal} snapshot, so
     * counting the balance would report the booking's value twice and bill the 90% that
     * passes through to the worker as a platform fee.
     */
    @Test
    void aSettledBalanceDoesNotInflateRevenueOrFees() {
        AdminAnalyticsResponse before = adminService.getAnalytics(today.minusYears(1), today);

        savePayment(seededTask, seededCustomer, "analytics-balance-" + seedId,
                "900.00", "1000.00", PaymentType.BALANCE, PaymentStatus.COMPLETED);

        AdminAnalyticsResponse after = adminService.getAnalytics(today.minusYears(1), today);

        assertThat(after.getTotalRevenue()).isEqualByComparingTo(before.getTotalRevenue());
        assertThat(after.getPlatformFees()).isEqualByComparingTo(before.getPlatformFees());
        assertThat(after.getPaidBookings()).isEqualTo(before.getPaidBookings());
    }

    @Test
    void ranksCategoriesAndLocationsByTaskVolume() {
        AdminAnalyticsResponse analytics = adminService.getAnalytics(today.minusYears(1), today);

        assertThat(analytics.getTopCategories())
                .anySatisfy(row -> {
                    assertThat(row.getLabel()).isEqualTo("Electrical");
                    assertThat(row.getTaskCount()).isGreaterThanOrEqualTo(2);
                    // 1000 + 2000, so the value travels with the count.
                    assertThat(row.getTotalValue()).isGreaterThanOrEqualTo(new BigDecimal("3000.00"));
                });

        assertThat(analytics.getTopLocations())
                .anySatisfy(row -> {
                    assertThat(row.getLabel()).isEqualTo("Pokhara");
                    assertThat(row.getTaskCount()).isGreaterThanOrEqualTo(2);
                });
    }

    @Test
    void topListsAreCappedAndOrderedByVolume() {
        AdminAnalyticsResponse analytics = adminService.getAnalytics(today.minusYears(1), today);

        assertThat(analytics.getTopCategories()).hasSizeLessThanOrEqualTo(5);
        assertThat(analytics.getTopLocations()).hasSizeLessThanOrEqualTo(5);
        assertThat(analytics.getTopCategories())
                .extracting(AnalyticsBreakdownRow::getTaskCount)
                .isSortedAccordingTo((a, b) -> Long.compare(b, a));
    }

    @Test
    void aWindowWithNoActivityReportsZeroesRatherThanNulls() {
        LocalDate longAgo = today.minusYears(20);
        AdminAnalyticsResponse analytics = adminService.getAnalytics(longAgo, longAgo.plusDays(7));

        assertThat(analytics.getTotalTasks()).isZero();
        assertThat(analytics.getNewUsers()).isZero();
        assertThat(analytics.getPaidBookings()).isZero();
        assertThat(analytics.getTotalRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(analytics.getPlatformFees()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(analytics.getTopCategories()).isEmpty();
        assertThat(analytics.getTopLocations()).isEmpty();
    }

    /** "to = today" has to include what was recorded today, not stop at midnight. */
    @Test
    void theEndOfTheWindowIncludesTheWholeOfThatDay() {
        assertThat(adminService.getAnalytics(today, today).getTotalTasks())
                .isGreaterThanOrEqualTo(3);
    }

    @Test
    void anOmittedRangeFallsBackToTheLastYear() {
        AdminAnalyticsResponse analytics = adminService.getAnalytics(null, null);

        assertThat(analytics.getTo()).isEqualTo(today);
        assertThat(analytics.getFrom()).isEqualTo(today.minusYears(1));
    }

    @Test
    void aBackwardsRangeIsRejected() {
        assertThatThrownBy(() -> adminService.getAnalytics(today, today.minusDays(1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
