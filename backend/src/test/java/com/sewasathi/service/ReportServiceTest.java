package com.sewasathi.service;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentProvider;
import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.TaskStatus;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exercises the JasperReports pipeline end to end (requirement #14): the .jrxml templates
 * compile, the repository aggregates fill them, and both exporters produce a real file.
 *
 * <p>The format assertions check magic bytes rather than file size, because a broken
 * exporter still happily writes a non-empty stream.
 */
@SpringBootTest
@ActiveProfiles("test")
class ReportServiceTest {

    @Autowired
    private ReportService reportService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    private final LocalDate from = LocalDate.now().minusYears(1);
    private final LocalDate to = LocalDate.now();

    @BeforeEach
    void seedOneCompletedJob() {
        long unique = System.nanoTime();

        User customer = userRepository.save(User.builder()
                .email("report-customer-" + unique + "@example.com")
                .passwordHash("x").fullName("Report Customer").phone("9800000010")
                .role(Role.CUSTOMER).status(ApprovalStatus.APPROVED).build());

        User worker = userRepository.save(User.builder()
                .email("report-worker-" + unique + "@example.com")
                .passwordHash("x").fullName("Report Worker").phone("9800000011")
                .role(Role.WORKER).status(ApprovalStatus.APPROVED).build());

        workerProfileRepository.save(WorkerProfile.builder()
                .user(worker).skills("Plumbing").location("Kathmandu")
                .hourlyRate(new BigDecimal("500.00"))
                .tasksCompleted(3).ratingAverage(new BigDecimal("4.50")).ratingCount(2)
                .build());

        Task task = taskRepository.save(Task.builder()
                .customer(customer).assignedWorker(worker)
                .title("Fix a tap").category("Plumbing").description("Leaking kitchen tap")
                .city("Kathmandu").location("Baneshwor")
                .budget(new BigDecimal("2500.00")).status(TaskStatus.COMPLETED)
                .build());

        paymentRepository.save(Payment.builder()
                .task(task).customer(customer)
                .transactionUuid("report-txn-" + unique)
                .amount(new BigDecimal("250.00")).taskTotal(new BigDecimal("2500.00"))
                .provider(PaymentProvider.ESEWA).status(PaymentStatus.COMPLETED)
                .build());
    }

    // ---------- PDF ----------

    @Test
    void everyReportRendersAsAPdf() {
        for (ReportType type : ReportType.values()) {
            byte[] pdf = reportService.generate(type, ReportService.Format.PDF, from, to);

            assertThat(pdf).as("%s should produce a non-trivial PDF", type).hasSizeGreaterThan(500);
            assertThat(Arrays.copyOf(pdf, 4))
                    .as("%s should start with the PDF magic bytes", type)
                    .isEqualTo("%PDF".getBytes());
        }
    }

    // ---------- Excel ----------

    @Test
    void everyReportRendersAsAnXlsxWorkbook() {
        for (ReportType type : ReportType.values()) {
            byte[] xlsx = reportService.generate(type, ReportService.Format.XLSX, from, to);

            assertThat(xlsx).as("%s should produce a non-trivial workbook", type).hasSizeGreaterThan(500);
            // .xlsx is a zip archive, so it opens with the PK local-file-header signature.
            assertThat(Arrays.copyOf(xlsx, 2))
                    .as("%s should start with the zip magic bytes", type)
                    .isEqualTo(new byte[] { 0x50, 0x4b });
        }
    }

    // ---------- data ----------

    @Test
    void revenueReportPicksUpCompletedPayments() {
        assertThat(paymentRepository.revenueByMonthAndProvider(PaymentStatus.COMPLETED,
                from.atStartOfDay(), to.plusDays(1).atStartOfDay()))
                .anySatisfy(row -> {
                    assertThat(row.getProviderName()).isEqualTo("ESEWA");
                    assertThat(row.getTransactionCount()).isPositive();
                    assertThat(row.getCollectedAmount()).isPositive();
                });
    }

    @Test
    void taskSummaryGroupsByCategoryAndStatus() {
        assertThat(taskRepository.summaryByCategoryAndStatus(
                from.atStartOfDay(), to.plusDays(1).atStartOfDay()))
                .anySatisfy(row -> {
                    assertThat(row.getCategory()).isEqualTo("Plumbing");
                    assertThat(row.getStatusName()).isEqualTo("COMPLETED");
                    assertThat(row.getTaskCount()).isPositive();
                });
    }

    /**
     * The earnings subquery is the part worth pinning down: computed as a join it would be
     * multiplied by the number of payments rather than summed once.
     */
    @Test
    void workerPerformanceReportsCountersAndEarnings() {
        assertThat(workerProfileRepository.workerPerformance())
                .anySatisfy(row -> {
                    assertThat(row.getWorkerName()).isEqualTo("Report Worker");
                    assertThat(row.getJobsCompleted()).isEqualTo(3);
                    assertThat(row.getAverageRating()).isEqualByComparingTo("4.50");
                    assertThat(row.getTotalEarnedOrZero()).isEqualByComparingTo("2500.00");
                });
    }

    // ---------- input handling ----------

    @Test
    void anUnknownReportOrFormatIsRejected() {
        assertThatThrownBy(() -> ReportType.fromSlug("../../etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> ReportService.Format.fromString("exe"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /**
     * An empty window must still yield a readable document - the template's noData section -
     * rather than failing, since "nothing happened last week" is a normal answer.
     */
    @Test
    void anEmptyRangeStillProducesAValidDocument() {
        LocalDate longAgo = LocalDate.now().minusYears(20);
        byte[] pdf = reportService.generate(
                ReportType.REVENUE, ReportService.Format.PDF, longAgo, longAgo.plusDays(1));

        assertThat(Arrays.copyOf(pdf, 4)).isEqualTo("%PDF".getBytes());
    }
}
