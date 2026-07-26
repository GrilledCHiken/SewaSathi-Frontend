package com.sewasathi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * An in-app notification, delivered live over the existing STOMP broker and also readable
 * from REST so it survives a page reload or arriving while the user was offline.
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_user_read", columnList = "user_id, is_read"),
        @Index(name = "idx_notification_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 500)
    private String body;

    /** Client-side route to open when the notification is clicked, e.g. "/dashboard/tasks". */
    @Column(length = 255)
    private String link;

    // "read" is a reserved word in several databases, so the column is named explicitly.
    @Column(name = "is_read", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    @Builder.Default
    private boolean read = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
