import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import PageShell, { PageHeader } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatTile from "../../components/ui/StatTile";
import EmptyState from "../../components/ui/EmptyState";
import SegmentedControl from "../../components/ui/SegmentedControl";
import Skeleton, { SkeletonCard } from "../../components/ui/Skeleton";
import { toneOf } from "../../components/ui/tones";
import {
  CardIcon,
  CheckCircleIcon,
  ClockIcon,
  SearchIcon,
} from "../../components/ui/icons";
import {
  ADVANCE_PERCENT_LABEL,
  BALANCE_PERCENT_LABEL,
  CHECK_ICON,
  INBOX_ICON,
  categoryMeta,
  formatDate,
  formatMoney,
} from "../../components/tasks/taskUi";
import { getMyEarnings } from "../../api/workerEarningsApi";
import {
  confirmCashPayment,
  rejectCashPayment,
} from "../../api/workerPaymentApi";

/**
 * Earnings.
 *
 * One server read, `GET /worker/earnings`. A job counts towards earnings the moment the
 * worker marks the work done, and it counts for its whole budget — that is what the work was
 * worth, and it is the number a worker means by "what I earned".
 *
 * Whether the money has actually landed is a separate question, because a task is paid in
 * two instalments and only the first is required before the work starts. So the headline
 * total is split: `received` is what has actually been paid, `outstanding` is the balance a
 * customer has been invoiced for but not paid. Folding those together would hide a customer
 * who never settles up, which is precisely the case a worker needs to see.
 *
 * This page is also where the worker answers a cash claim. That is not a display concern:
 * confirming it is what settles the payment and closes the job, so it moves money between
 * `outstanding` and `received` — which is why answering refetches rather than patching state.
 */

const FILTERS = ["All", "Paid in full", "Awaiting balance"];

const PROVIDER_LABEL = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "cash",
};

function matchesFilter(job, filter) {
  if (filter === "All") return true;
  return filter === "Paid in full" ? job.balancePaid : !job.balancePaid;
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

function EarningRow({ job }) {
  const meta = categoryMeta(job.category);
  const tone = job.balancePaid ? "success" : "warning";

  return (
    <li className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-field ${meta.tile}`}
      >
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{job.title}</p>
        <p className="truncate text-sm text-ink-muted">
          {[job.customerName, `finished ${formatDate(job.completedAt, "—")}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="truncate text-xs text-ink-faint">
          advance {formatMoney(job.advanceAmount)} · balance{" "}
          {formatMoney(job.balanceAmount)}
          {job.balancePaid && job.balanceProvider
            ? ` via ${PROVIDER_LABEL[job.balanceProvider] || job.balanceProvider}`
            : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-bold tabular-nums text-ink">
          {formatMoney(job.taskTotal)}
        </p>
        <Badge tone={tone} className="mt-1">
          {job.balancePaid ? "paid in full" : "awaiting balance"}
        </Badge>
      </div>
    </li>
  );
}

/** A finished job whose customer still owes the closing payment. */
function OutstandingRow({ job }) {
  return (
    <li className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneOf("warning").tile}`}
      >
        <ClockIcon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{job.title}</p>
        <p className="truncate text-sm text-ink-muted">
          {[job.customerName, `finished ${formatDate(job.completedAt, "—")}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-bold tabular-nums text-ink">
          {formatMoney(job.balanceAmount)}
        </p>
        <p className="text-xs text-ink-faint">balance owed</p>
      </div>
    </li>
  );
}

/**
 * A cash claim waiting on this worker's word. Nothing outside this room can verify it, so
 * the two buttons here are the only thing that can settle the payment — confirming closes
 * the job, rejecting hands it back to the customer to pay again.
 */
function CashClaimRow({ job, onConfirm, onReject, working }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneOf("warning").tile}`}
      >
        <CardIcon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{job.title}</p>
        <p className="truncate text-sm text-ink-muted">
          {job.customerName} says they paid you{" "}
          <span className="font-semibold text-ink-body">
            {formatMoney(job.balanceAmount)}
          </span>{" "}
          in cash
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          size="xs"
          variant="secondary"
          onClick={onReject}
          disabled={working}
        >
          Not received
        </Button>
        <Button size="xs" onClick={onConfirm} loading={working}>
          {working ? "Saving..." : "Confirm received"}
        </Button>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

function EarningsSkeleton() {
  return (
    <div role="status" aria-label="Loading your earnings">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-card border border-line bg-surface p-6 shadow-e1"
            aria-hidden="true"
          >
            <Skeleton className="h-5 w-1/3" rounded="rounded" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10" rounded="rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" rounded="rounded" />
                    <Skeleton className="h-3 w-1/3" rounded="rounded" />
                  </div>
                  <Skeleton className="h-4 w-16" rounded="rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function WorkerEarnings() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    getMyEarnings()
      .then(setEarnings)
      .catch(() => toast.error("Could not load your earnings."))
      .finally(() => setLoading(false));
  }, []);

  /* Answering a claim moves money between `received` and `outstanding` and can close a job,
     so the whole payload is reread rather than patched — half a dozen derived totals would
     otherwise have to be kept in step by hand. */
  const handleCashAnswer = async (taskId, received) => {
    setWorkingId(taskId);
    try {
      if (received) {
        await confirmCashPayment(taskId);
      } else {
        await rejectCashPayment(taskId);
      }
      setEarnings(await getMyEarnings());
      toast.success(
        received
          ? "Cash confirmed. That job is paid in full."
          : "Recorded. The customer has been asked to pay again.",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not record your answer.");
    } finally {
      setWorkingId(null);
    }
  };

  const jobs = useMemo(() => earnings?.jobs ?? [], [earnings]);

  const cashClaims = useMemo(
    () => jobs.filter((job) => job.cashDeclared),
    [jobs],
  );

  // A declared claim is chased from its own panel, so it is kept out of this one —
  // showing the same job in both would read as two separate debts.
  const outstandingJobs = useMemo(
    () => jobs.filter((job) => !job.balancePaid && !job.cashDeclared),
    [jobs],
  );

  const filteredJobs = useMemo(
    () => jobs.filter((job) => matchesFilter(job, filter)),
    [jobs, filter],
  );

  // One predicate feeds both the pills and the list, so the counts cannot disagree
  // with what the list actually shows.
  const counts = useMemo(
    () =>
      FILTERS.reduce((acc, key) => {
        acc[key] = jobs.filter((job) => matchesFilter(job, key)).length;
        return acc;
      }, {}),
    [jobs],
  );

  const awaitingCount = earnings?.jobsAwaitingBalance ?? 0;

  return (
    <PageShell header={<WorkerHeader title="Earnings" />} width="lg">
      <PageHeader
        title="Earnings"
        description="What your finished jobs are worth, and how much of it has actually landed."
      />

      <div className="mt-6">
        {loading ? (
          <EarningsSkeleton />
        ) : !earnings ? (
          <EmptyState
            icon={INBOX_ICON}
            title="Earnings unavailable"
            body="We couldn't load your earnings just now. Refresh the page to try again."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Lifetime earned"
                value={formatMoney(earnings.lifetimeEarned)}
                tone="brand"
                icon={<CardIcon className="h-6 w-6" />}
                hint="Total value of every job you've completed"
              />
              <StatTile
                label="Received"
                value={formatMoney(earnings.received)}
                tone="success"
                icon={<CheckCircleIcon className="h-6 w-6" />}
                hint={`${formatMoney(earnings.advanceReceived)} in advances · ${formatMoney(earnings.balanceReceived)} in balances`}
              />
              <StatTile
                label="Outstanding"
                value={formatMoney(earnings.outstanding)}
                tone="warning"
                icon={<ClockIcon className="h-6 w-6" />}
                hint={
                  awaitingCount > 0
                    ? `${awaitingCount} job${awaitingCount === 1 ? "" : "s"} awaiting a final payment`
                    : "Every job is settled"
                }
              />
              <StatTile
                label="Jobs completed"
                value={earnings.jobsCompleted}
                tone="info"
                to="/worker/jobs"
              />
            </div>

            {/* Full width and first: this is the only thing on the page that is waiting
                on the worker rather than on somebody else. */}
            {cashClaims.length > 0 && (
              <div className="mt-6">
                <Panel title="Cash to confirm" padding="lg">
                  <p className="mb-3 text-sm text-ink-muted">
                    Only you can vouch for cash. Confirm it and the job is closed and paid
                    in full; if the money never arrived, say so and the customer will be
                    asked to pay again.
                  </p>
                  <ul className="divide-y divide-line-soft">
                    {cashClaims.map((job) => (
                      <CashClaimRow
                        key={job.taskId}
                        job={job}
                        working={workingId === job.taskId}
                        onConfirm={() => handleCashAnswer(job.taskId, true)}
                        onReject={() => handleCashAnswer(job.taskId, false)}
                      />
                    ))}
                  </ul>
                </Panel>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Awaiting final payment" padding="lg">
                {outstandingJobs.length === 0 ? (
                  <EmptyState
                    tone="bare"
                    icon={CHECK_ICON}
                    title="Nothing outstanding"
                    body="Every job you've finished has been paid in full."
                  />
                ) : (
                  <>
                    <p className="mb-3 text-sm text-ink-muted">
                      You&apos;ve been paid the {ADVANCE_PERCENT_LABEL} advance on these.
                      The remaining {BALANCE_PERCENT_LABEL} is with the customer to settle,
                      by eSewa, Khalti or cash in hand.
                    </p>
                    <ul className="divide-y divide-line-soft">
                      {outstandingJobs.map((job) => (
                        <OutstandingRow key={job.taskId} job={job} />
                      ))}
                    </ul>
                  </>
                )}
              </Panel>

              <Panel title="Earnings history" padding="lg">
                {jobs.length === 0 ? (
                  <EmptyState
                    tone="bare"
                    icon={INBOX_ICON}
                    title="No earnings yet"
                    body="Finish your first job and what it was worth shows up here, along with what the customer has paid."
                    action={
                      <Button as={Link} to="/worker/tasks">
                        Browse open tasks
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <SegmentedControl
                      options={FILTERS}
                      value={filter}
                      onChange={setFilter}
                      counts={counts}
                      size="sm"
                      ariaLabel="Filter earnings"
                      className="mb-4"
                    />

                    {filteredJobs.length === 0 ? (
                      <EmptyState
                        tone="bare"
                        icon={<SearchIcon className="h-6 w-6" />}
                        title="Nothing here"
                        body="No jobs match this filter."
                      />
                    ) : (
                      <ul className="divide-y divide-line-soft">
                        {filteredJobs.map((job) => (
                          <EarningRow key={job.taskId} job={job} />
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
