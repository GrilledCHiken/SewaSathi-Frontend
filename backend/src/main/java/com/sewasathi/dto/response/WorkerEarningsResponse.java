package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * What a worker has earned, for {@code GET /api/worker/earnings}. {@code lifetimeEarned} is the
 * full budget of every job this worker finished; {@code received} is what has actually been
 * paid and {@code outstanding} the difference, kept apart so an unpaid balance stays visible.
 * {@code jobsCompleted} counts only settled jobs - the rest fall under
 * {@code jobsAwaitingBalance}.
 */
@Getter
@AllArgsConstructor
public class WorkerEarningsResponse {
    private BigDecimal lifetimeEarned;
    private BigDecimal received;
    private BigDecimal outstanding;
    private BigDecimal advanceReceived;
    private BigDecimal balanceReceived;
    private long jobsCompleted;
    private long jobsAwaitingBalance;
    /** Cash claims sitting on this worker's desk, waiting for them to confirm or reject. */
    private long jobsAwaitingCashConfirmation;
    private List<WorkerEarningRow> jobs;
}
