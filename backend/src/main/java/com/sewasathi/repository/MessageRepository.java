package com.sewasathi.repository;

import com.sewasathi.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Resolves a stored attachment back to its message, so access can be checked against the conversation. */
    java.util.Optional<Message> findByAttachmentUrl(String attachmentUrl);
    List<Message> findByTaskIdInOrderByCreatedAtAsc(Collection<Long> taskIds);
    Message findFirstByTaskIdInOrderByCreatedAtDesc(Collection<Long> taskIds);

    /**
     * Stamps every message the reader has not sent and not yet read. Chat is one-to-one, so
     * "not sent by me" is the same as "sent to me". Returns the number of rows changed, which
     * is how the caller knows whether a read receipt is worth broadcasting.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Message m SET m.readAt = :now WHERE m.task.id IN :taskIds "
            + "AND m.sender.id <> :readerId AND m.readAt IS NULL")
    int markRead(@Param("taskIds") Collection<Long> taskIds,
                 @Param("readerId") Long readerId,
                 @Param("now") LocalDateTime now);

    /**
     * Unread totals for every task on screen in one query. Grouped by task rather than by
     * conversation because a conversation spans several tasks and only the service knows
     * which ones - see {@code MessageService.unreadSummary}.
     *
     * <p>Tombstones are excluded: a message that was deleted before you read it should not
     * leave a badge you can never clear by reading anything.
     */
    @Query("SELECT m.task.id AS taskId, COUNT(m) AS unread FROM Message m WHERE m.task.id IN :taskIds "
            + "AND m.sender.id <> :readerId AND m.readAt IS NULL AND m.deleted = false GROUP BY m.task.id")
    List<TaskUnreadCount> countUnreadByTask(@Param("taskIds") Collection<Long> taskIds,
                                            @Param("readerId") Long readerId);

    interface TaskUnreadCount {
        Long getTaskId();
        long getUnread();
    }
}
