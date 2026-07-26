package com.sewasathi.repository;

import com.sewasathi.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByTaskIdInOrderByCreatedAtAsc(Collection<Long> taskIds);
    Message findFirstByTaskIdInOrderByCreatedAtDesc(Collection<Long> taskIds);
}
