package com.sewasathi.entity;

/**
 * Which leg of a task's price a payment covers.
 *
 * <p>A task is paid in two instalments. The {@link #ADVANCE} is the 10% a customer pays to
 * confirm a booking a worker has accepted, and it is what moves the task to
 * {@link TaskStatus#ASSIGNED}. The {@link #BALANCE} is the remaining 90%, due once the
 * worker has finished the work and moved the task to {@link TaskStatus#AWAITING_PAYMENT}.
 *
 * <p>A settled balance is what closes the job out: it moves the task from
 * {@code AWAITING_PAYMENT} to {@link TaskStatus#COMPLETED}. So {@code COMPLETED} now means
 * "done and paid for", and every count, review gate and report keyed off it reads that way.
 * A gateway balance settles the moment it is verified; a {@link PaymentProvider#CASH} one
 * only when the worker confirms receipt.
 */
public enum PaymentType {
    ADVANCE,
    BALANCE
}
