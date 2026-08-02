import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import { Panel } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import EmptyState from "../components/ui/EmptyState";
import SegmentedControl from "../components/ui/SegmentedControl";
import Skeleton, { SkeletonCard } from "../components/ui/Skeleton";
import { toneOf } from "../components/ui/tones";
import {
  CardIcon,
  CheckCircleIcon,
  ClockIcon,
  SearchIcon,
} from "../components/ui/icons";
import {
  CHECK_ICON,
  INBOX_ICON,
  advanceFor,
  categoryMeta,
  formatDate,
  formatMoney,
  formatStatus,
} from "../components/tasks/taskUi";
import { listMyPayments } from "../api/paymentApi";
import { listMyTasks } from "../api/taskApi";

/**
 * Payments.
 *
 * Two server reads back this page. `GET /payments/mine` is the transaction
 * history — one row per checkout attempt, so it also carries the abandoned
 * ones. `GET /tasks/mine` supplies the other half: a task sitting in `accepted`
 * is one a worker has said yes to but the advance has not settled on, which is
 * the only state where money is genuinely owed.
 *
 * Those two must not be conflated. A `PENDING` payment row is a checkout the
 * customer walked away from — the backend cancels stale ones on the next
 * attempt — so it is history, never a debt. Everything labelled "awaiting" here
 * is derived from task status, not from payment status.
 */

/* -------------------------------------------------------------------------- */
/* Presentation lookups                                                        */
/* -------------------------------------------------------------------------- */

const PROVIDER_LABEL = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

function providerLabel(provider) {
  return PROVIDER_LABEL[provider] || provider || "Unknown";
}

/**
 * Mirrors `PaymentStatus` on the backend — PENDING, COMPLETED, FAILED,
 * CANCELLED. There is no refund flow, so there is no refunded state to show.
 */
const STATUS_META = {
  completed: {
    tone: "success",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  pending: {
    tone: "warning",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  failed: {
    tone: "danger",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    ),
  },
  cancelled: {
    tone: "neutral",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="m4.9 4.9 14.2 14.2" />
      </svg>
    ),
  },
};

const TX_FILTERS = ["All", "Completed", "Pending", "Failed"];

/**
 * A cancelled row is a superseded attempt rather than a separate idea a customer
 * needs a tab for, so it files under Failed alongside the real failures. One
 * predicate serves both the visible list and the pill counts, so the two cannot
 * disagree.
 */
function matchesFilter(payment, filter) {
  if (filter === "All") return true;
  const status = formatStatus(payment.status);
  if (filter === "Failed") return status === "failed" || status === "cancelled";
  return status === filter.toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

/** A task a worker has accepted, still waiting on its confirmation advance. */
function AwaitingTaskRow({ task }) {
  const meta = categoryMeta(task.category);

  return (
    <li className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-field ${meta.tile}`}
      >
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{task.title}</p>
        <p className="truncate text-sm text-ink-muted">
          {[task.assignedWorker?.fullName, `due ${formatDate(task.dueDate)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-bold tabular-nums text-ink">
          {formatMoney(advanceFor(task.budget))}
        </p>
        <p className="text-xs text-ink-faint">advance</p>
      </div>

      <Button
        as={Link}
        to={`/dashboard/checkout/${task.id}`}
        size="sm"
        className="shrink-0"
      >
        Pay
      </Button>
    </li>
  );
}

function TransactionItem({ payment }) {
  const status = formatStatus(payment.status);
  const meta = STATUS_META[status] || STATUS_META.pending;

  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneOf(meta.tone).tile}`}
      >
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">
          {payment.task?.title ||
            (payment.task?.id ? `Task #${payment.task.id}` : "Payment")}
        </p>
        <p className="truncate text-sm text-ink-muted">
          {formatDate(payment.createdAt, "—")} · {providerLabel(payment.provider)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-bold tabular-nums text-ink">
          {formatMoney(payment.amount)}
        </p>
        {payment.taskTotal != null && (
          <p className="text-xs text-ink-faint">
            of {formatMoney(payment.taskTotal)}
          </p>
        )}
        <Badge tone={meta.tone} className="mt-1">
          {status}
        </Badge>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

function PaymentsSkeleton() {
  return (
    <div role="status" aria-label="Loading your payments">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
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

export default function CustomerPayment() {
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState("All");

  useEffect(() => {
    Promise.all([listMyPayments(), listMyTasks()])
      .then(([paymentData, taskData]) => {
        setPayments(paymentData);
        setTasks(taskData);
      })
      .catch(() => toast.error("Could not load your payments."))
      .finally(() => setLoading(false));
  }, []);

  // `accepted` is the same predicate checkout uses to decide an advance is due.
  const awaitingTasks = useMemo(
    () => tasks.filter((task) => formatStatus(task.status) === "accepted"),
    [tasks],
  );

  const totalPaid = useMemo(
    () =>
      payments
        .filter((p) => formatStatus(p.status) === "completed")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );

  const totalAwaiting = useMemo(
    () => awaitingTasks.reduce((sum, task) => sum + advanceFor(task.budget), 0),
    [awaitingTasks],
  );

  const filteredPayments = useMemo(
    () => payments.filter((p) => matchesFilter(p, txFilter)),
    [payments, txFilter],
  );

  const counts = useMemo(
    () =>
      TX_FILTERS.reduce((acc, filter) => {
        acc[filter] = payments.filter((p) => matchesFilter(p, filter)).length;
        return acc;
      }, {}),
    [payments],
  );

  const awaitingCount = awaitingTasks.length;

  return (
    <PageShell
      header={<DashboardHeader title="Payments" searchPlaceholder="Search workers..." />}
      width="lg"
    >
      <PageHeader
        title="Payments"
        description="Your advance payments and anything still waiting to be confirmed."
      />

      <div className="mt-6">
        {loading ? (
          <PaymentsSkeleton />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile
                label="Total Paid"
                value={formatMoney(totalPaid)}
                tone="success"
                icon={<CheckCircleIcon className="h-6 w-6" />}
              />
              <StatTile
                label="Awaiting Payment"
                value={formatMoney(totalAwaiting)}
                tone="warning"
                icon={<ClockIcon className="h-6 w-6" />}
                hint={
                  awaitingCount > 0
                    ? `${awaitingCount} task${awaitingCount === 1 ? "" : "s"} to confirm`
                    : "Nothing due right now"
                }
                to={awaitingCount > 0 ? "/dashboard/tasks" : undefined}
              />
              <StatTile
                label="Transactions"
                value={payments.length}
                tone="info"
                icon={<CardIcon className="h-6 w-6" />}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Awaiting Payment" padding="lg">
                {awaitingTasks.length === 0 ? (
                  <EmptyState
                    tone="bare"
                    icon={CHECK_ICON}
                    title="You're all caught up"
                    body="No tasks are waiting on an advance right now."
                  />
                ) : (
                  <ul className="divide-y divide-line-soft">
                    {awaitingTasks.map((task) => (
                      <AwaitingTaskRow key={task.id} task={task} />
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Transaction History" padding="lg">
                {payments.length === 0 ? (
                  <EmptyState
                    tone="bare"
                    icon={INBOX_ICON}
                    title="No payments yet"
                    body="Once a worker accepts one of your tasks, you'll pay a 10% advance to confirm it — and it'll show up here."
                    action={
                      <Button as={Link} to="/dashboard/tasks">
                        View my tasks
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <SegmentedControl
                      options={TX_FILTERS}
                      value={txFilter}
                      onChange={setTxFilter}
                      counts={counts}
                      size="sm"
                      ariaLabel="Filter transactions"
                      className="mb-4"
                    />

                    {filteredPayments.length === 0 ? (
                      <EmptyState
                        tone="bare"
                        icon={<SearchIcon className="h-6 w-6" />}
                        title="Nothing here"
                        body="No transactions match this filter."
                      />
                    ) : (
                      <ul className="divide-y divide-line-soft">
                        {filteredPayments.map((payment) => (
                          <TransactionItem key={payment.id} payment={payment} />
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
