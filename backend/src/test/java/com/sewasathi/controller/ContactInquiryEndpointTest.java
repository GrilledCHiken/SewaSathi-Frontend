package com.sewasathi.controller;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.ContactMessage;
import com.sewasathi.entity.Notification;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.User;
import com.sewasathi.repository.ContactMessageRepository;
import com.sewasathi.repository.NotificationRepository;
import com.sewasathi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The Contact Us inbox: that an anonymous inquiry reaches every administrator, and that only an
 * administrator can read the resulting messages or mark them dealt with.
 *
 * <p>The platform sends no mail, so the in-app notification is the whole delivery mechanism -
 * if the fan-out stops working, an inquiry is silently lost, which is what these tests guard.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContactInquiryEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User admin;
    private String subject;

    @BeforeEach
    void seedAdminAndSubject() {
        long unique = System.nanoTime();
        // The subject doubles as this test's marker: the context is shared, so assertions pick
        // their own inquiry out of whatever other tests have left in the table.
        subject = "Inquiry " + unique;

        admin = userRepository.save(User.builder()
                .email("inquiry-admin-" + unique + "@example.com")
                .passwordHash("x").fullName("Inquiry Admin").phone("9800000051")
                .role(Role.ADMIN).status(ApprovalStatus.APPROVED).build());
    }

    private void submitInquiry() throws Exception {
        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Bishal Thapa",
                                  "email": "Bishal.Thapa@Example.com",
                                  "subject": "%s",
                                  "message": "My worker never arrived for the booking."
                                }
                                """.formatted(subject)))
                .andExpect(status().isCreated());
    }

    private ContactMessage submitted() {
        return contactMessageRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(m -> subject.equals(m.getSubject()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("The inquiry was not persisted"));
    }

    @Test
    void anAnonymousInquiry_isStoredUnhandled() throws Exception {
        submitInquiry();

        ContactMessage saved = submitted();
        assertThat(saved.getName()).isEqualTo("Bishal Thapa");
        // Normalised on the way in, so the same person is one address however they type it.
        assertThat(saved.getEmail()).isEqualTo("bishal.thapa@example.com");
        assertThat(saved.isHandled()).isFalse();
        assertThat(saved.getHandledAt()).isNull();
    }

    @Test
    void anAnonymousInquiry_notifiesAnAdministrator() throws Exception {
        submitInquiry();

        List<Notification> delivered = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(admin.getId(), PageRequest.of(0, 10))
                .getContent();

        assertThat(delivered).anySatisfy(notification -> {
            assertThat(notification.getType()).isEqualTo("CONTACT_MESSAGE");
            assertThat(notification.getTitle()).isEqualTo("New contact inquiry");
            assertThat(notification.getBody()).contains("Bishal Thapa").contains(subject);
            // Clicking through has to land on the inbox, not the dashboard.
            assertThat(notification.getLink()).isEqualTo("/admin/inquiries");
            assertThat(notification.isRead()).isFalse();
        });
    }

    @Test
    void anAdmin_readsTheInquiryInFull() throws Exception {
        submitInquiry();

        mockMvc.perform(get("/api/admin/inquiries").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.subject == '" + subject + "')].name").value("Bishal Thapa"))
                // The body ships with the list row so opening one costs no second request.
                .andExpect(jsonPath("$[?(@.subject == '" + subject + "')].message")
                        .value("My worker never arrived for the booking."))
                .andExpect(jsonPath("$[?(@.subject == '" + subject + "')].handled").value(false));
    }

    @Test
    void theHandledFilter_separatesOutstandingFromDealtWith() throws Exception {
        submitInquiry();
        Long id = submitted().getId();

        mockMvc.perform(get("/api/admin/inquiries").param("handled", "false")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isNotEmpty());

        mockMvc.perform(get("/api/admin/inquiries").param("handled", "true")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isEmpty());
    }

    @Test
    void resolvingAndReopening_movesTheInquiryBetweenFilters() throws Exception {
        submitInquiry();
        Long id = submitted().getId();

        mockMvc.perform(patch("/api/admin/inquiries/" + id + "/resolve")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handled").value(true))
                .andExpect(jsonPath("$.handledAt").isNotEmpty());

        mockMvc.perform(get("/api/admin/inquiries").param("handled", "true")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isNotEmpty());

        mockMvc.perform(patch("/api/admin/inquiries/" + id + "/reopen")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handled").value(false));

        // Asserted against the row, not the JSON: a null field and an absent one are
        // indistinguishable to jsonPath.
        ContactMessage reopened = contactMessageRepository.findById(id).orElseThrow();
        assertThat(reopened.isHandled()).isFalse();
        assertThat(reopened.getHandledAt()).isNull();
    }

    @Test
    void theOverviewCount_tracksOutstandingInquiries() throws Exception {
        long before = contactMessageRepository.countByHandledFalse();

        submitInquiry();

        mockMvc.perform(get("/api/admin/overview").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newInquiries").value((int) before + 1));
    }

    @Test
    void anUnknownInquiry_isNotFound() throws Exception {
        mockMvc.perform(patch("/api/admin/inquiries/999999/resolve")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void aNonAdmin_cannotReadTheInbox() throws Exception {
        submitInquiry();

        mockMvc.perform(get("/api/admin/inquiries").with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/admin/inquiries/" + submitted().getId() + "/resolve")
                        .with(user("worker").roles("WORKER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAnonymousVisitor_cannotReadTheInbox() throws Exception {
        mockMvc.perform(get("/api/admin/inquiries"))
                .andExpect(status().isUnauthorized());
    }
}
