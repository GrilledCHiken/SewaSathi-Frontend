package com.sewasathi.entity;

public enum PaymentProvider {
    ESEWA,
    KHALTI,
    /**
     * Money handed over in person. Nothing can verify it server-to-server, so the row is written
     * PENDING when the customer declares it and reaches {@link PaymentStatus#COMPLETED} only once
     * the worker confirms receipt. Settles the {@link PaymentType#BALANCE} only.
     */
    CASH
}
