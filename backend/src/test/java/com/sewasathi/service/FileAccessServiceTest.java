package com.sewasathi.service;

import com.sewasathi.entity.ApprovalStatus;
import com.sewasathi.entity.Message;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.MessageRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Guards the fix for a real data-exposure bug: uploads were served by a static resource
 * handler under a {@code permitAll()} rule, so a worker's citizenship document and police
 * clearance certificate could be read by anyone with the URL.
 *
 * <p>The denial tests are the point of this class. If someone later reinstates the static
 * handler or loosens these rules, these fail.
 */
@ExtendWith(MockitoExtension.class)
class FileAccessServiceTest {

    @Mock private MessageRepository messageRepository;
    @Mock private WorkerProfileRepository workerProfileRepository;
    @Mock private UserRepository userRepository;

    private FileAccessService fileAccessService;

    private User customer;
    private User worker;
    private User stranger;
    private User admin;

    private static final String FILE = "8f14e45f-ea11-4a12-9c3e-000000000001.pdf";
    private static final String URL = "/uploads/" + FILE;

    @BeforeEach
    void setUp() {
        fileAccessService = new FileAccessService(messageRepository, workerProfileRepository, userRepository);
        customer = user(1L, "customer@example.com", Role.CUSTOMER);
        worker = user(2L, "worker@example.com", Role.WORKER);
        stranger = user(3L, "stranger@example.com", Role.CUSTOMER);
        admin = user(4L, "admin@example.com", Role.ADMIN);
    }

    private static User user(Long id, String email, Role role) {
        return User.builder().id(id).email(email).fullName("User " + id).phone("9800000000")
                .role(role).status(ApprovalStatus.APPROVED).build();
    }

    private void knownUser(User u) {
        lenient().when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
    }

    private void fileIsIdentityDocument() {
        WorkerProfile profile = WorkerProfile.builder()
                .id(1L).user(worker).citizenshipDocUrl(URL).build();
        lenient().when(messageRepository.findByAttachmentUrl(URL)).thenReturn(Optional.empty());
        lenient().when(workerProfileRepository.findByPoliceClearanceUrlOrCitizenshipDocUrl(URL, URL))
                .thenReturn(Optional.of(profile));
    }

    private void fileIsChatAttachment() {
        Task task = Task.builder().id(1L).customer(customer).assignedWorker(worker).title("Cleaning").build();
        Message message = Message.builder().id(1L).task(task).sender(worker).attachmentUrl(URL).build();
        lenient().when(messageRepository.findByAttachmentUrl(URL)).thenReturn(Optional.of(message));
    }

    // --- Identity documents: the actual vulnerability ---

    @Test
    void identityDocument_isNotReadableByAnUnrelatedUser() {
        knownUser(stranger);
        fileIsIdentityDocument();

        // This is the case that used to return the document to anyone at all.
        assertThatThrownBy(() -> fileAccessService.assertCanRead(FILE, stranger.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void identityDocument_isNotReadableByTheCustomerWhoHiredTheWorker() {
        knownUser(customer);
        fileIsIdentityDocument();

        // Hiring someone does not entitle you to their citizenship papers.
        assertThatThrownBy(() -> fileAccessService.assertCanRead(FILE, customer.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void identityDocument_isReadableByItsOwner() {
        knownUser(worker);
        fileIsIdentityDocument();

        assertThatCode(() -> fileAccessService.assertCanRead(FILE, worker.getEmail()))
                .doesNotThrowAnyException();
    }

    @Test
    void identityDocument_isReadableByAnAdmin() {
        knownUser(admin);

        // Admins run the verification queue and have to be able to open what they approve.
        assertThatCode(() -> fileAccessService.assertCanRead(FILE, admin.getEmail()))
                .doesNotThrowAnyException();
    }

    // --- Chat attachments ---

    @Test
    void chatAttachment_isReadableBySender() {
        knownUser(worker);
        fileIsChatAttachment();

        assertThatCode(() -> fileAccessService.assertCanRead(FILE, worker.getEmail()))
                .doesNotThrowAnyException();
    }

    @Test
    void chatAttachment_isReadableByTheRecipient() {
        knownUser(customer);
        fileIsChatAttachment();

        // Checked against the task's participants, not just the sender, or the person the
        // file was sent to could not open it.
        assertThatCode(() -> fileAccessService.assertCanRead(FILE, customer.getEmail()))
                .doesNotThrowAnyException();
    }

    @Test
    void chatAttachment_isNotReadableByAThirdParty() {
        knownUser(stranger);
        fileIsChatAttachment();

        assertThatThrownBy(() -> fileAccessService.assertCanRead(FILE, stranger.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- Profile photos are public-facing by design ---

    @Test
    void profilePhoto_isReadableByAnySignedInUser() {
        knownUser(stranger);
        when(messageRepository.findByAttachmentUrl(URL)).thenReturn(Optional.empty());
        when(workerProfileRepository.findByPoliceClearanceUrlOrCitizenshipDocUrl(URL, URL))
                .thenReturn(Optional.empty());
        when(workerProfileRepository.findByProfilePhotoUrl(URL))
                .thenReturn(Optional.of(WorkerProfile.builder().id(1L).user(worker).profilePhotoUrl(URL).build()));

        // Shown on the worker browse cards, so locking it down would break that listing.
        assertThatCode(() -> fileAccessService.assertCanRead(FILE, stranger.getEmail()))
                .doesNotThrowAnyException();
    }

    // --- Unreferenced files ---

    @Test
    void fileNothingReferences_isRefused() {
        knownUser(customer);
        when(messageRepository.findByAttachmentUrl(URL)).thenReturn(Optional.empty());
        when(workerProfileRepository.findByPoliceClearanceUrlOrCitizenshipDocUrl(URL, URL))
                .thenReturn(Optional.empty());
        when(workerProfileRepository.findByProfilePhotoUrl(URL)).thenReturn(Optional.empty());

        // No owning record means nothing to authorise against, so fail closed.
        assertThatThrownBy(() -> fileAccessService.assertCanRead(FILE, customer.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deniedAccess_reportsNotFoundRatherThanForbidden() {
        knownUser(stranger);
        fileIsIdentityDocument();

        // Answering 403 would confirm the filename exists, which is itself a leak to
        // someone probing for other people's uploads.
        assertThatThrownBy(() -> fileAccessService.assertCanRead(FILE, stranger.getEmail()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void unknownRequester_isRefused() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fileAccessService.assertCanRead(FILE, "ghost@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
