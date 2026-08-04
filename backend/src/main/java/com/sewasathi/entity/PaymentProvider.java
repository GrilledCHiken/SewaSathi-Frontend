package com.sewasathi.entity;

public enum PaymentProvider {
    ESEWA,
    KHALTI,
    /**
     * Money handed over in person. The only provider with no gateway behind it: nothing can
     * verify a cash payment server-to-server, so a {@code CASH} row is written PENDING when
     * the customer declares it and only reaches {@link PaymentStatus#COMPLETED} once the
     * assigned worker confirms they actually received it.
     *
     * <p>Cash settles the {@link PaymentType#BALANCE} only - the advance has to clear a real
     * gateway before a booking is confirmed.
     */
    CASH
}
