package com.sewasathi.service;

import com.sewasathi.entity.PaymentStatus;
import com.sewasathi.repository.PaymentRepository;
import com.sewasathi.repository.TaskRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Generates the admin reports (requirement #14) with JasperReports. Compiling a {@code .jrxml}
 * generates and compiles Java for every expression in it, so each design is compiled once and
 * cached under {@link ReportType} - a closed set, so the cache cannot grow without bound.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);
    private static final DateTimeFormatter RANGE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final PaymentRepository paymentRepository;
    private final TaskRepository taskRepository;
    private final WorkerProfileRepository workerProfileRepository;

    private final Map<ReportType, JasperReport> compiled = new ConcurrentHashMap<>();

    /** Output formats the console offers. */
    public enum Format {
        PDF("pdf", "application/pdf"),
        XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        private final String extension;
        private final String contentType;

        Format(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }

        public String getExtension() {
            return extension;
        }

        public String getContentType() {
            return contentType;
        }

        public static Format fromString(String value) {
            for (Format format : values()) {
                if (format.extension.equalsIgnoreCase(value)) {
                    return format;
                }
            }
            throw new IllegalArgumentException("Unsupported report format: " + value);
        }
    }

    /**
     * Renders a report to bytes.
     *
     * @param from inclusive start of the window; ignored by reports that are point-in-time
     * @param to   inclusive end of the window - widened to the end of that day internally,
     *             so "to = today" includes everything that happened today
     */
    public byte[] generate(ReportType type, Format format, LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        // Exclusive upper bound at the start of the following day: a plain to.atStartOfDay()
        // would silently drop everything recorded on the last day of the range.
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        List<?> rows = loadRows(type, start, end);

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("REPORT_TITLE", type.getTitle());
        parameters.put("GENERATED_AT", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")));
        parameters.put("RANGE_LABEL", type.isDateRanged()
                ? from.format(RANGE_FORMAT) + " - " + to.format(RANGE_FORMAT)
                : "As at " + LocalDate.now().format(RANGE_FORMAT));
        parameters.put("ROW_COUNT", rows.size());

        try {
            // An empty datasource still produces a valid document - the template's noData
            // section renders instead of the table, which is friendlier than a failure.
            JasperPrint print = JasperFillManager.fillReport(
                    compiledDesign(type), parameters, new JRBeanCollectionDataSource(rows));
            return export(print, format);
        } catch (JRException ex) {
            throw new IllegalStateException("Could not generate the " + type.getSlug() + " report", ex);
        }
    }

    private List<?> loadRows(ReportType type, LocalDateTime start, LocalDateTime end) {
        return switch (type) {
            case REVENUE -> paymentRepository.revenueByMonthAndProvider(PaymentStatus.COMPLETED, start, end);
            case TASK_SUMMARY -> taskRepository.summaryByCategoryAndStatus(start, end);
            case WORKER_PERFORMANCE -> workerProfileRepository.workerPerformance();
        };
    }

    private byte[] export(JasperPrint print, Format format) throws JRException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        switch (format) {
            case PDF -> {
                JRPdfExporter exporter = new JRPdfExporter();
                exporter.setExporterInput(new SimpleExporterInput(print));
                exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(out));
                exporter.exportReport();
            }
            case XLSX -> {
                JRXlsxExporter exporter = new JRXlsxExporter();
                exporter.setExporterInput(new SimpleExporterInput(print));
                exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(out));
                exporter.exportReport();
            }
        }
        return out.toByteArray();
    }

    /**
     * Compiles the design on first request and keeps it. {@code computeIfAbsent} means a
     * burst of concurrent requests for the same report compiles it once, not once each.
     */
    private JasperReport compiledDesign(ReportType type) {
        return compiled.computeIfAbsent(type, key -> {
            String path = "reports/" + key.getSlug() + ".jrxml";
            try (InputStream stream = new ClassPathResource(path).getInputStream()) {
                log.info("Compiling report template {}", path);
                return JasperCompileManager.compileReport(stream);
            } catch (IOException | JRException ex) {
                throw new IllegalStateException("Could not compile report template " + path, ex);
            }
        });
    }

    /** Filename offered to the browser, e.g. {@code sewasathi-revenue-2026-07-27.pdf}. */
    public String fileName(ReportType type, Format format) {
        return "sewasathi-" + type.getSlug() + "-" + LocalDate.now() + "." + format.getExtension();
    }
}
