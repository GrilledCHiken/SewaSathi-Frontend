package com.sewasathi.controller.web;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Role;
import com.sewasathi.service.AdminService;
import com.sewasathi.service.ReportService;
import com.sewasathi.service.ReportType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.LocalDate;

/**
 * Server-rendered admin console (requirement #4): Thymeleaf views over Spring MVC.
 *
 * <p>Deliberately holds no business logic of its own - every view is assembled from the same
 * {@link AdminService} the REST API uses, so the two surfaces can never drift into disagreeing
 * about what "pending" or "suspended" means.
 *
 * <p>State-changing operations live in {@link AdminWebApiController} and are called over AJAX,
 * which keeps these handlers to plain GETs and puts every mutation behind a CSRF token.
 */
@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminWebController {

    private final AdminService adminService;
    private final ReportService reportService;

    /**
     * Read straight from the container rather than re-parsing the property, so the countdown
     * the page shows can never disagree with the timeout the server actually enforces.
     */
    @ModelAttribute("sessionTimeoutSeconds")
    public int sessionTimeoutSeconds(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return session != null ? session.getMaxInactiveInterval() : 0;
    }

    /**
     * The signed-in admin's name for the header. Supplied from here rather than through
     * Thymeleaf's {@code sec:} dialect so the console needs no extra template dependency.
     */
    @ModelAttribute("currentAdmin")
    public String currentAdmin(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() ? authentication.getName() : null;
    }

    @GetMapping
    public String index() {
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/login")
    public String login(Authentication authentication) {
        // Spring Security permits this page unconditionally, so an admin who is already
        // signed in would otherwise be shown a login form they do not need.
        if (authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return "redirect:/admin/dashboard";
        }
        return "admin/login";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("overview", adminService.getOverview());
        model.addAttribute("pendingWorkers", adminService.listPendingWorkers());
        model.addAttribute("activePage", "dashboard");
        return "admin/dashboard";
    }

    @GetMapping("/users")
    public String users(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) ApprovalStatus status,
            Model model
    ) {
        model.addAttribute("users", adminService.listUsers(role, status));
        model.addAttribute("roles", Role.values());
        model.addAttribute("statuses", ApprovalStatus.values());
        model.addAttribute("selectedRole", role);
        model.addAttribute("selectedStatus", status);
        model.addAttribute("activePage", "users");
        return "admin/users";
    }

    @GetMapping("/workers")
    public String workers(Model model) {
        model.addAttribute("pendingWorkers", adminService.listPendingWorkers());
        model.addAttribute("activePage", "workers");
        return "admin/workers";
    }

    @GetMapping("/reports")
    public String reports(Model model) {
        model.addAttribute("reportTypes", ReportType.values());
        model.addAttribute("formats", ReportService.Format.values());
        // Default window: the last full year, which is wide enough that a new install
        // still shows data on the first visit.
        model.addAttribute("defaultFrom", LocalDate.now().minusYears(1));
        model.addAttribute("defaultTo", LocalDate.now());
        model.addAttribute("activePage", "reports");
        return "admin/reports";
    }

    /**
     * Streams a generated report back as a download (requirement #14).
     *
     * <p>{@code slug} is resolved through {@link ReportType#fromSlug}, so it can only ever
     * name one of the three known templates - it reaches a classpath lookup, and an
     * unchecked string there would be a path-traversal hole.
     */
    @GetMapping("/reports/{slug}")
    public ResponseEntity<byte[]> downloadReport(
            @PathVariable String slug,
            @RequestParam(defaultValue = "pdf") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        ReportType type = ReportType.fromSlug(slug);
        ReportService.Format outputFormat = ReportService.Format.fromString(format);
        LocalDate start = from != null ? from : LocalDate.now().minusYears(1);
        LocalDate end = to != null ? to : LocalDate.now();

        byte[] body = reportService.generate(type, outputFormat, start, end);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(outputFormat.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(reportService.fileName(type, outputFormat))
                                .build().toString())
                .body(body);
    }

    /**
     * A bad {@code slug} or {@code format} is a malformed request, not a server fault -
     * without this it would surface as a 500 through the generic handler.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleUnknownReport() {
        return "error/400";
    }

    /**
     * Access-denied target for the admin chain. Reachable by any signed-in user by design -
     * it exists to explain the refusal to the non-admins it turns away.
     */
    @GetMapping("/denied")
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public String denied() {
        return "error/403";
    }
}
