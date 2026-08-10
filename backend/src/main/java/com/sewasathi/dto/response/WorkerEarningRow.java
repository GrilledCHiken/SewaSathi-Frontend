package com.sewasathi.dto.response;

import com.sewasathi.entity.PaymentProvider;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One completed job on the worker's earnings page. {@code advanceAmount} and
 * {@code balanceAmount} are what each leg is <em>worth</em> and add up to {@code taskTotal};
 * the two booleans say which has actually been received.
 */
@Getter
@AllArgsConstructor
public class WorkerEarningRow {
    private Long taskId;
    private String title;
    private String category;
    private String customerName;
    /** When the work was finished - the task's last write. */
    private LocalDateTime completedAt;
    private BigDecimal taskTotal;
    private BigDecimal advanceAmount;
    private BigDecimal balanceAmount;
    private boolean advancePaid;
    private boolean balancePaid;
    /** How the balance was paid; null while it is still outstanding. */
    private PaymentProvider balanceProvider;
    private LocalDateTime settledAt;
    /**
     * The customer declared a cash handover, awaiting the worker's confirmation. Never true
     * alongside {@code balancePaid}, so the page reads three states: paid, claimed, owed.
     */
    private boolean cashDeclared;
    /** Whether the job is closed, or still open pending its balance. */
    private boolean settled;
}
