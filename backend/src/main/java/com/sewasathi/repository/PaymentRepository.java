package com.sewasathi.repository;

import com.sewasathi.entity.Payment;
import com.sewasathi.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionUuid(String transactionUuid);

    /** Looks a payment up by the gateway's own handle — Khalti's {@code pidx}. */
    Optional<Payment> findByProviderRef(String providerRef);

    List<Payment> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Payment> findByTaskIdAndStatus(Long taskId, PaymentStatus status);

    boolean existsByTaskIdAndStatus(Long taskId, PaymentStatus status);
}
