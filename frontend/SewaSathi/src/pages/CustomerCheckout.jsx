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

const ADVANCE_PERCENT = `${Math.round(ADVANCE_RATE * 100)}%`;

const METHODS = [
  {
    id: "ESEWA",
    name: "eSewa",
    blurb: "Pay from your eSewa wallet",
    available: true,
    tone: "text-emerald-600",
    tile: "bg-emerald-100",
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
    tone: "text-purple-600",
    tile: "bg-purple-100",
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
            ? "text-sm font-semibold text-slate-900"
            : `text-sm ${muted ? "text-slate-500" : "text-slate-600"}`
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "text-lg font-bold text-slate-900"
            : `text-sm font-semibold ${muted ? "text-slate-500" : "text-slate-800"}`
        }
      >
        {value}
      </span>
    </div>
  );
}

function Notice({ tone, title, body, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    slate: "border-slate-200 bg-white text-slate-700",
  };
  return (
    <div className={`rounded-2xl border p-6 sm:p-8 ${tones[tone] || tones.slate}`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm">{body}</p>
      {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
    </div>
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

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <Link
              to="/dashboard/tasks"
              className="text-sm font-semibold text-slate-500 transition hover:text-brand"
            >
              &larr; Back to My Tasks
            </Link>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Confirm Your Task
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Pay a {ADVANCE_PERCENT} advance to lock in your worker.
            </p>
          </div>

          {loading ? (
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ) : !task ? (
            <Notice
              tone="slate"
              title="Task not found"
              body="This task no longer exists, or it isn't yours."
            >
              <Link
                to="/dashboard/tasks"
                className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Back to My Tasks
              </Link>
            </Notice>
          ) : status !== "accepted" ? (
            <Notice
              tone={status === "assigned" || status === "in progress" ? "emerald" : "slate"}
              title={
                status === "assigned" || status === "in progress"
                  ? "This task is already confirmed"
                  : "No advance is due on this task"
              }
              body={
                status === "assigned" || status === "in progress"
                  ? "The advance has been paid. You can message your worker any time."
                  : `This task is ${status}. An advance is only due once a worker accepts it.`
              }
            >
              {(status === "assigned" || status === "in progress") && (
                <Link
                  to={`/dashboard/messages?taskId=${task.id}`}
                  className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Message worker
                </Link>
              )}
              <Link
                to="/dashboard/tasks"
                className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand/30 hover:text-brand"
              >
                Back to My Tasks
              </Link>
            </Notice>
          ) : (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Order summary
                </h3>

                <p className="mt-3 text-base font-bold text-slate-900">{task.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[task.category, task.city].filter(Boolean).join(" · ")}
                </p>

                {worker && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${palette.bg} ${palette.text}`}
                    >
                      {initialsOf(worker.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {worker.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        Accepted your task
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100 pt-2">
                  <SummaryRow label="Task total" value={formatMoney(task.budget)} />
                  <SummaryRow
                    label={`Advance due now (${ADVANCE_PERCENT})`}
                    value={formatMoney(advance)}
                    strong
                  />
                  <SummaryRow
                    label="Remaining after completion"
                    value={formatMoney(remainingAfter(task.budget))}
                    muted
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Payment method
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {METHODS.map((option) => {
                    const selected = method === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={!option.available}
                        aria-pressed={selected}
                        onClick={() => setMethod(option.id)}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                          !option.available
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                            : selected
                              ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                              : "border-slate-200 bg-white hover:border-brand/30"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${option.tile} ${option.tone}`}
                        >
                          {option.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {option.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {option.blurb}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
                  <span className="font-semibold">Demo payment.</span> This runs on{" "}
                  {gateway.name}&apos;s test sandbox, so no real money is charged. Sign
                  in there with {gateway.sandbox}
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="mt-5 w-full rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {paying
                    ? `Redirecting to ${gateway.name}...`
                    : `Pay ${formatMoney(advance)} with ${gateway.name}`}
                </button>

                <p className="mt-3 text-xs text-slate-500">
                  You&apos;ll be taken to {gateway.name} to authorise the payment, then
                  brought straight back here.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
