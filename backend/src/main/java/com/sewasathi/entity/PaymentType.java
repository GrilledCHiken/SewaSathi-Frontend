package com.sewasathi.entity;

/**
 * Which leg of a task's price a payment covers. The {@link #ADVANCE} is the 10% that confirms
 * a booking and moves the task to {@link TaskStatus#ASSIGNED}; the {@link #BALANCE} is the rest,
 * due at {@link TaskStatus#AWAITING_PAYMENT}, and settling it moves the task to
 * {@link TaskStatus#COMPLETED} - so COMPLETED means "done and paid for".
 */
public enum PaymentType {
    ADVANCE,
    BALANCE
}
