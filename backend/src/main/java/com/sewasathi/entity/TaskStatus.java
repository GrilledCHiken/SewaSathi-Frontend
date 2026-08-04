package com.sewasathi.entity;

public enum TaskStatus {
    OPEN,
    /** A customer hired a named worker directly; that worker has not answered yet. */
    REQUESTED,
    ACCEPTED,
    ASSIGNED,
    IN_PROGRESS,
    /**
     * The worker has finished the work but the closing {@link PaymentType#BALANCE} is still
     * outstanding. A task sits here until the balance settles - by gateway, which verifies
     * itself, or in cash, which the worker has to confirm they received.
     */
    AWAITING_PAYMENT,
    COMPLETED,
    CANCELLED
}
