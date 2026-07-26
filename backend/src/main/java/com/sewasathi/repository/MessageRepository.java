package com.sewasathi.repository;

import com.sewasathi.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Resolves a stored attachment back to its message, so access can be checked against the conversation. */
    java.util.Optional<Message> findByAttachmentUrl(String attachmentUrl);
    List<Message> findByTaskIdInOrderByCreatedAtAsc(Collection<Long> taskIds);
    Message findFirstByTaskIdInOrderByCreatedAtDesc(Collection<Long> taskIds);
}
