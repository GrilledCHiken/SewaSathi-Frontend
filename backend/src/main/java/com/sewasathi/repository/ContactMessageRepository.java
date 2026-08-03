package com.sewasathi.repository;

import com.sewasathi.entity.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

    /** Newest first: an inbox is read from the top. */
    List<ContactMessage> findAllByOrderByCreatedAtDesc();

    List<ContactMessage> findByHandledOrderByCreatedAtDesc(boolean handled);

    /** The outstanding count behind the admin overview badge. */
    long countByHandledFalse();
}
