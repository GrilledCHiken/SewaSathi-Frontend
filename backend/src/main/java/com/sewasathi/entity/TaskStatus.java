package com.sewasathi.entity;

public enum TaskStatus {
    OPEN,
    /** A customer hired a named worker directly; that worker has not answered yet. */
    REQUESTED,
    ACCEPTED,
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
