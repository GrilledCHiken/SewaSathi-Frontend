package com.sewasathi.repository;

import com.sewasathi.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByTaskIdOrderByCreatedAtAsc(Long taskId);
    Message findFirstByTaskIdOrderByCreatedAtDesc(Long taskId);
}
