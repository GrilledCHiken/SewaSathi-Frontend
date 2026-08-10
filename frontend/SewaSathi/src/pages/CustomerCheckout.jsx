import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import {
  ADVANCE_RATE,
  BALANCE_PERCENT_LABEL,
  advanceFor,
  balanceDue,
  cashDeclared,
  formatMoney,
  formatStatus,
  initialsOf,
  paletteFor,
  remainingAfter,
} from "../components/tasks/taskUi";
import { getTask } from "../api/taskApi";
import {
  declareCashBalance,
  initiateAdvancePayment,
  initiateBalancePayment,
  listMyPayments,
} from "../api/paymentApi";
import useConfirm from "../hooks/useConfirm";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import Card, { Panel } from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import RadioCard from "../components/ui/RadioCard";
import Skeleton from "../components/ui/Skeleton";

const ADVANCE_PERCENT = `${Math.round(ADVANCE_RATE * 100)}%`;

const METHODS = [
  {
    id: "ESEWA",
    name: "eSewa",
    blurb: "Pay from your eSewa wallet",
    available: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    // eSewa's UAT sandbox uses one shared demo merchant, with published test logins.
    sandbox: (
      <>
        eSewa ID <code className="font-semibold">9711111111</code>, password{" "}
        <code className="font-semibold">Nepal@123</code> and OTP{" "}
        <code className="font-semibold">123456</code>.
      </>
    ),
  },
  {
    id: "KHALTI",
    name: "Khalti",
    blurb: "Pay from your Khalti wallet",
    available: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
      </svg>
    ),
    sandbox: (
      <>
        Khalti ID <code className="font-semibold">9800000001</code>, MPIN{" "}
        <code className="font-semibold">1111</code> and OTP{" "}
        <code className="font-semibold">987654</code>.
      </>
    ),
  },
  {
    id: "CASH",
    name: "Cash in hand",
    blurb: "Hand the money to your worker in person",
    available: true,
    // Balance only: the advance has to clear a real gateway before a booking is confirmed.
    balanceOnly: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
];

function SummaryRow({ label, value, strong = false, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span
        className={
          strong
            ? "text-sm font-semibold text-ink"
            : `text-sm ${muted ? "text-ink-faint" : "text-ink-muted"}`
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "text-lg font-bold tabular-nums text-ink"
            : `text-sm font-semibold tabular-nums ${muted ? "text-ink-faint" : "text-ink-body"}`
        }
      >
        {value}
      </span>
    </div>
  );
}

function Notice({ tone = "neutral", title, body, children }) {
  return (
    <Card padding="xl" radius="panel">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
      {tone === "success" && (
        <div className="mt-4">
          <Alert tone="success" icon={false}>
            The advance has been received.
          </Alert>
        </div>
      )}
      {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
    </Card>
  );
}

/**
 * Hands the customer over to the gateway. Khalti returns a ready-made link, so it is a plain
 * navigation; eSewa's ePay v2 only accepts a form-encoded POST it can render a page for, so
 * that one has to be a real browser form submission rather than an XHR.
 */
function redirectToGateway({ formUrl, fields, redirectUrl }) {
  if (redirectUrl) {
    window.location.assign(redirectUrl);
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = formUrl;
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

/**
 * Checkout, for either instalment. One route serves both legs and reads which is due off the
 * data rather than the URL — `accepted` means the advance, `awaiting payment` the balance —
 * so the eSewa failure redirect can point back here without knowing which leg failed.
 *
 * <p>The balance can also be paid in cash, which is not a checkout: nothing is redirected to
 * and the claim waits on the worker, so that case takes over the page with a waiting notice.
 */
export default function CustomerCheckout() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("ESEWA");
  const [paying, setPaying] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    Promise.all([getTask(taskId), listMyPayments()])
      .then(([taskData, paymentData]) => {
        setTask(taskData);
        setPayments(paymentData);
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || "Could not load this task."),
      )
      .finally(() => setLoading(false));
  }, [taskId]);

  const status = formatStatus(task?.status);
  // Nothing is due unless one of these two says so. A declared-but-unconfirmed cash payment
  // counts as nothing due, or a Pay button would invite paying twice.
  const awaitingCashConfirmation = task ? cashDeclared(task, payments) : false;
  const mode = !task
    ? null
    : status === "accepted"
      ? "advance"
      : balanceDue(task, payments)
        ? "balance"
        : null;

  // Cash is only an option on the closing leg, and `method` outlives a mode change, so a
  // stale selection is forced back to a gateway.
  const methods = METHODS.filter(
    (option) => mode === "balance" || !option.balanceOnly,
  );
  const selected =
    methods.find((option) => option.id === method) ?? methods[0];
  const payingCash = selected.id === "CASH";
  const dueNow =
    mode === "balance" ? remainingAfter(task?.budget) : advanceFor(task?.budget);
  const worker = task?.assignedWorker;
  const palette = paletteFor(worker?.id);

  const handlePay = async () => {
    // Cash is a claim about money that has already changed hands and the worker is asked to
    // vouch for it; a gateway leg hands the customer off to somebody else's site. Both are
    // worth a beat before they happen.
    const ok = await confirm(
      payingCash
        ? {
            title: `Confirm you paid ${formatMoney(dueNow)} in cash?`,
            body: `${worker?.fullName || "Your worker"} will be asked to confirm they received it. Only say yes if you've actually handed the money over.`,
            confirmLabel: "Yes, I paid in cash",
            cancelLabel: "Not yet",
            tone: "danger",
          }
        : {
            title: `Pay ${formatMoney(dueNow)} with ${selected.name}?`,
            body: `You'll be taken to ${selected.name} to finish the payment, then brought back here.`,
            confirmLabel: `Continue to ${selected.name}`,
            cancelLabel: "Go back",
            tone: "primary",
          },
    );
    if (!ok) return;

    setPaying(true);
    try {
      if (payingCash) {
        // No gateway, no redirect: this records a claim and stays put, so the page can
        // switch straight to telling the customer who they are now waiting on.
        const payment = await declareCashBalance(Number(taskId));
        setPayments((prev) => [payment, ...prev]);
        toast.success(
          `Cash payment recorded. ${worker?.fullName || "Your worker"} needs to confirm it.`,
        );
        setPaying(false);
        return;
      }
      const initiate =
        mode === "balance" ? initiateBalancePayment : initiateAdvancePayment;
      const initiation = await initiate(Number(taskId), selected.id);
      redirectToGateway(initiation);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not start the payment. Please try again.",
      );
      setPaying(false);
    }
  };

  // "Confirmed" here means the advance has landed and nothing more is owed yet. A completed
  // task with its balance settled is a separate, terminal case.
  const confirmed = status === "assigned" || status === "in progress";
  const paidInFull = status === "completed";

  // The back affordance lives in DashboardHeader; `backTo` is the fallback for a deep link.
  const header = <DashboardHeader title="Checkout" backTo="/dashboard/tasks" />;

  return (
    <PageShell header={header} width="lg">
      <PageHeader
        title={mode === "balance" ? "Settle Your Task" : "Confirm Your Task"}
        description={
          mode === "balance"
            ? `Your worker has finished. Pay the remaining ${BALANCE_PERCENT_LABEL} to close the job out.`
            : `Pay a ${ADVANCE_PERCENT} advance to lock in your worker.`
        }
      />

      <div className="mt-6">
        {loading ? (
          <div role="status" aria-label="Loading checkout">
            <Skeleton className="h-64 w-full" rounded="rounded-panel" />
          </div>
        ) : !task ? (
          <Notice
            title="Task not found"
            body="This task no longer exists, or it isn't yours."
          >
            <Button as={Link} to="/dashboard/tasks">
              Back to My Tasks
            </Button>
          </Notice>
        ) : !mode ? (
          <Notice
            tone={confirmed || paidInFull ? "success" : "neutral"}
            title={
              awaitingCashConfirmation
                ? "Waiting on your worker"
                : paidInFull
                  ? "This task is paid in full"
                  : confirmed
                    ? "This task is already confirmed"
                    : "Nothing is due on this task"
            }
            body={
              awaitingCashConfirmation
                ? `You've marked ${formatMoney(remainingAfter(task.budget))} as paid in cash. ${
                    worker?.fullName || "Your worker"
                  } needs to confirm they received it, and the job closes as soon as they do.`
                : paidInFull
                  ? "Both the advance and the balance have been paid. Nothing more is owed on this job."
                  : confirmed
                    ? "The advance has been paid. The balance falls due once your worker finishes the job."
                    : `This task is ${status}. An advance is only due once a worker accepts it.`
            }
          >
            {(confirmed || paidInFull || awaitingCashConfirmation) && (
              <Button as={Link} to={`/dashboard/messages?taskId=${task.id}`}>
                Message worker
              </Button>
            )}
            <Button as={Link} to="/dashboard/tasks" variant="secondary">
              Back to My Tasks
            </Button>
          </Notice>
        ) : (
          /* Two columns at lg: method choice on the left, the amount that is
             actually about to be charged pinned on the right. */
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <Panel title="Payment method" padding="lg">
                <div className="grid gap-3">
                  {methods.map((option) => (
                    <RadioCard
                      key={option.id}
                      selected={selected.id === option.id}
                      unavailable={!option.available}
                      onSelect={() => setMethod(option.id)}
                      icon={option.icon}
                      title={option.name}
                      description={option.blurb}
                    />
                  ))}
                </div>

                {payingCash ? (
                  <Alert tone="warning" title="Confirmed by your worker" className="mt-5">
                    Hand the money over in person, then record it here. The job stays
                    open until {worker?.fullName || "your worker"} confirms they
                    received it — so only mark it paid once you&apos;ve actually paid.
                  </Alert>
                ) : (
                  <Alert tone="info" title="Demo payment" className="mt-5">
                    This runs on {selected.name}&apos;s test sandbox, so no real money
                    is charged. Sign in there with {selected.sandbox}
                  </Alert>
                )}
              </Panel>
            </div>

            <aside className="lg:col-span-2">
              <div className="lg:sticky lg:top-[calc(var(--dash-header-h)+1.5rem)]">
                <Panel title="Order summary" padding="lg">
                  <p className="text-base font-bold text-ink">{task.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {[task.category, task.city].filter(Boolean).join(" · ")}
                  </p>

                  {worker && (
                    <div className="mt-4 flex items-center gap-3 rounded-field border border-line bg-surface-muted p-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${palette.bg} ${palette.text}`}
                      >
                        {initialsOf(worker.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {worker.fullName}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {mode === "balance"
                            ? "Finished your task"
                            : "Accepted your task"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* The amount about to leave the customer's wallet, set as
                      the largest thing on the panel. */}
                  <div className="mt-5 rounded-card bg-brand-50 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                      Due now (
                      {mode === "balance"
                        ? `${BALANCE_PERCENT_LABEL} balance`
                        : `${ADVANCE_PERCENT} advance`}
                      )
                    </p>
                    <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-brand-700">
                      {formatMoney(dueNow)}
                    </p>
                  </div>

                  <div className="mt-4 divide-y divide-line-soft border-t border-line-soft pt-2">
                    <SummaryRow label="Task total" value={formatMoney(task.budget)} />
                    {mode === "balance" ? (
                      <SummaryRow
                        label="Advance already paid"
                        value={formatMoney(advanceFor(task.budget))}
                        muted
                      />
                    ) : (
                      <SummaryRow
                        label="Remaining after completion"
                        value={formatMoney(remainingAfter(task.budget))}
                        muted
                      />
                    )}
                  </div>

                  <Button
                    size="lg"
                    fullWidth
                    className="mt-5"
                    onClick={handlePay}
                    loading={paying}
                  >
                    {payingCash
                      ? paying
                        ? "Recording..."
                        : `I paid ${formatMoney(dueNow)} in cash`
                      : paying
                        ? `Redirecting to ${selected.name}...`
                        : `Pay with ${selected.name}`}
                  </Button>

                  <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                    {payingCash
                      ? `${worker?.fullName || "Your worker"} will be asked to confirm they received it. The job closes once they do.`
                      : `You'll be taken to ${selected.name} to authorise the payment, then brought straight back here.`}
                  </p>
                </Panel>
              </div>
            </aside>
          </div>
        )}
      </div>

      {confirmDialog}
    </PageShell>
  );
}
