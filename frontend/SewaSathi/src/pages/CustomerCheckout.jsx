import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import {
  ADVANCE_RATE,
  advanceFor,
  formatMoney,
  formatStatus,
  initialsOf,
  paletteFor,
  remainingAfter,
} from "../components/tasks/taskUi";
import { getTask } from "../api/taskApi";
import { initiateAdvancePayment } from "../api/paymentApi";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import Card, { Panel } from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import RadioCard from "../components/ui/RadioCard";
import Skeleton from "../components/ui/Skeleton";
import { ArrowLeftIcon } from "../components/ui/icons";

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
 * Hands the customer over to the gateway.
 *
 * <p>Khalti opens the payment on the backend and returns a ready-made link, so it
 * is a plain navigation. eSewa's ePay v2 instead only accepts a form-encoded POST
 * it can render a page for, so that one has to be a real browser form submission
 * rather than an XHR.
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

export default function CustomerCheckout() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("ESEWA");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getTask(taskId)
      .then(setTask)
      .catch((err) =>
        toast.error(err.response?.data?.message || "Could not load this task."),
      )
      .finally(() => setLoading(false));
  }, [taskId]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const initiation = await initiateAdvancePayment(Number(taskId), method);
      redirectToGateway(initiation);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not start the payment. Please try again.",
      );
      setPaying(false);
    }
  };

  const status = formatStatus(task?.status);
  const gateway = METHODS.find((option) => option.id === method);
  const advance = advanceFor(task?.budget);
  const worker = task?.assignedWorker;
  const palette = paletteFor(worker?.id);
  const confirmed = status === "assigned" || status === "in progress";

  const header = <DashboardHeader title="Checkout" searchPlaceholder="Search workers..." />;

  const backLink = (
    <Link
      to="/dashboard/tasks"
      className="inline-flex items-center gap-1.5 rounded-field px-1 py-0.5 text-sm font-semibold text-ink-muted transition hover:text-brand focus-ring"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      Back to My Tasks
    </Link>
  );

  return (
    <PageShell header={header} width="lg">
      <PageHeader
        back={<div className="mb-2">{backLink}</div>}
        title="Confirm Your Task"
        description={`Pay a ${ADVANCE_PERCENT} advance to lock in your worker.`}
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
        ) : status !== "accepted" ? (
          <Notice
            tone={confirmed ? "success" : "neutral"}
            title={
              confirmed
                ? "This task is already confirmed"
                : "No advance is due on this task"
            }
            body={
              confirmed
                ? "The advance has been paid. You can message your worker any time."
                : `This task is ${status}. An advance is only due once a worker accepts it.`
            }
          >
            {confirmed && (
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
                  {METHODS.map((option) => (
                    <RadioCard
                      key={option.id}
                      selected={method === option.id}
                      unavailable={!option.available}
                      onSelect={() => setMethod(option.id)}
                      icon={option.icon}
                      title={option.name}
                      description={option.blurb}
                    />
                  ))}
                </div>

                <Alert tone="info" title="Demo payment" className="mt-5">
                  This runs on {gateway.name}&apos;s test sandbox, so no real money
                  is charged. Sign in there with {gateway.sandbox}
                </Alert>
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
                          Accepted your task
                        </p>
                      </div>
                    </div>
                  )}

                  {/* The amount about to leave the customer's wallet, set as
                      the largest thing on the panel. */}
                  <div className="mt-5 rounded-card bg-brand-50 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                      Due now ({ADVANCE_PERCENT} advance)
                    </p>
                    <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-brand-700">
                      {formatMoney(advance)}
                    </p>
                  </div>

                  <div className="mt-4 divide-y divide-line-soft border-t border-line-soft pt-2">
                    <SummaryRow label="Task total" value={formatMoney(task.budget)} />
                    <SummaryRow
                      label="Remaining after completion"
                      value={formatMoney(remainingAfter(task.budget))}
                      muted
                    />
                  </div>

                  <Button
                    size="lg"
                    fullWidth
                    className="mt-5"
                    onClick={handlePay}
                    loading={paying}
                  >
                    {paying
                      ? `Redirecting to ${gateway.name}...`
                      : `Pay with ${gateway.name}`}
                  </Button>

                  <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                    You&apos;ll be taken to {gateway.name} to authorise the payment,
                    then brought straight back here.
                  </p>
                </Panel>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
}
