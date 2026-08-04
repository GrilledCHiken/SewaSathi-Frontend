package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * What a worker has earned, for {@code GET /api/worker/earnings}.
 *
 * <p>{@code lifetimeEarned} is the full budget of every job whose work this worker has
 * finished - what the work was worth, which is the figure a worker means by "earnings".
 * {@code received} is the part that has actually been paid, and {@code outstanding} is the
 * difference. They are reported separately rather than folded together because a customer who
 * never pays the balance would otherwise be invisible.
 *
 * <p>{@code jobsCompleted} counts only jobs that are settled and closed, so it agrees with
 * the worker's public completed-jobs figure. A job whose work is done but whose balance is
 * outstanding is counted by {@code jobsAwaitingBalance} instead.
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
