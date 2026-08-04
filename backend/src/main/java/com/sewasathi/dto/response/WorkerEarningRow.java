package com.sewasathi.dto.response;

import com.sewasathi.entity.PaymentProvider;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One completed job on the worker's earnings page, with both instalments broken out.
 *
 * <p>{@code advanceAmount} and {@code balanceAmount} are what each leg is <em>worth</em> and
 * always add up to {@code taskTotal}; the two booleans say which of them has actually been
 * received. Splitting it this way lets the page show an outstanding balance on a job whose
 * customer has not paid up, rather than quietly showing a smaller total.
 */
@Getter
@AllArgsConstructor
public class WorkerEarningRow {
    private Long taskId;
    private String title;
    private String category;
    private String customerName;
    /** When the work was finished - the task's last write, which is that transition. */
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
     * The customer says they handed this over in cash and it is waiting on the worker's word.
     * Never true alongside {@code balancePaid} - confirming the cash sets one and clears the
     * other - so the page can treat them as three distinct states: paid, claimed, owed.
     */
    private boolean cashDeclared;
    /** Whether the job is closed, or still open pending its balance. */
    private boolean settled;
}
