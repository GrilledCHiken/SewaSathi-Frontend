package com.sewasathi.service;

import com.sewasathi.entity.Message;
import com.sewasathi.entity.Role;
import com.sewasathi.entity.Task;
import com.sewasathi.entity.User;
import com.sewasathi.entity.WorkerProfile;
import com.sewasathi.exception.ResourceNotFoundException;
import com.sewasathi.repository.MessageRepository;
import com.sewasathi.repository.UserRepository;
import com.sewasathi.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Decides who may read an uploaded file.
 *
 * <p>Uploads used to be served straight off disk by a static resource handler mapped to
 * {@code /uploads/**}, which Spring Security permitted anonymously. Because a worker's
 * police clearance certificate and citizenship document are stored there, anyone holding
 * (or guessing) a URL could read another person's identity papers. This class is the
 * replacement: every read now resolves the file back to the record that references it and
 * checks the caller against it.
 *
 * <p>Access rules, which differ by what the file actually is:
 * <ul>
 *   <li><b>Chat attachments</b> - the two participants of the conversation, and admins.</li>
 *   <li><b>Identity documents</b> - the owning worker and admins only.</li>
 *   <li><b>Profile photos</b> - any signed-in user, because they are shown on the public
 *       worker browse cards. Locking these down would break that listing, and a profile
 *       picture is not sensitive in the way an ID document is.</li>
 * </ul>
 *
 * <p>Denials are reported as "not found" rather than "forbidden": confirming that a given
 * filename exists would leak information to someone probing for other people's uploads.
 */
@Service
@RequiredArgsConstructor
public class FileAccessService {

    private final MessageRepository messageRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final UserRepository userRepository;

    /** The form these URLs take in the database, e.g. {@code /uploads/<uuid>.jpg}. */
    private static String toStoredUrl(String filename) {
        return "/uploads/" + filename;
    }

    @Transactional(readOnly = true)
    public void assertCanRead(String filename, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> notFound(filename));

        if (requester.getRole() == Role.ADMIN) {
            return;
        }

        String url = toStoredUrl(filename);

        Message attachment = messageRepository.findByAttachmentUrl(url).orElse(null);
        if (attachment != null) {
            if (isConversationParticipant(attachment, requester)) {
                return;
            }
            throw notFound(filename);
        }

        WorkerProfile identityDoc = workerProfileRepository
                .findByPoliceClearanceUrlOrCitizenshipDocUrl(url, url).orElse(null);
        if (identityDoc != null) {
            if (identityDoc.getUser().getId().equals(requester.getId())) {
                return;
            }
            throw notFound(filename);
        }

        if (workerProfileRepository.findByProfilePhotoUrl(url).isPresent()) {
            return;
        }

        // Nothing in the database references this file. It is either deleted or was never
        // ours; either way there is no owner to authorise the read against.
        throw notFound(filename);
    }

    /**
     * A chat attachment belongs to a task, and a task has exactly two people attached to
     * it. Checking the task rather than just the sender means the recipient can open what
     * they were sent.
     */
    private boolean isConversationParticipant(Message message, User requester) {
        if (message.getSender() != null && message.getSender().getId().equals(requester.getId())) {
            return true;
        }
        Task task = message.getTask();
        if (task == null) {
            return false;
        }
        Long requesterId = requester.getId();
        boolean isCustomer = task.getCustomer() != null
                && task.getCustomer().getId().equals(requesterId);
        boolean isWorker = task.getAssignedWorker() != null
                && task.getAssignedWorker().getId().equals(requesterId);
        return isCustomer || isWorker;
    }

    private static ResourceNotFoundException notFound(String filename) {
        return new ResourceNotFoundException("No file named " + filename);
    }
}
