import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import TaskCard from "../../components/tasks/TaskCard";
import TaskEmptyState from "../../components/tasks/TaskEmptyState";
import TaskFilterBar from "../../components/tasks/TaskFilterBar";
import TaskListSkeleton from "../../components/tasks/TaskListSkeleton";
import {
  CHAT_LOCKED_HINT,
  INBOX_ICON,
  chatUnlocked,
  formatMoney,
  formatStatus,
  remainingAfter,
} from "../../components/tasks/taskUi";
import useConfirm from "../../hooks/useConfirm";
import {
  cashNotReceivedConfirm,
  cashReceivedConfirm,
} from "../../utils/confirmMessages";
import {
  acceptTask,
  completeTask,
  declineTask,
  listMyJobs,
  startTask,
} from "../../api/workerTaskApi";
import { getMyEarnings } from "../../api/workerEarningsApi";
import {
  confirmCashPayment,
  rejectCashPayment,
} from "../../api/workerPaymentApi";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "assigned", label: "Assigned" },
  { key: "in progress", label: "In Progress" },
  { key: "awaiting payment", label: "Awaiting Payment" },
  { key: "completed", label: "Completed" },
];

function JobActions({
  status,
  cashDeclared,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onConfirmCash,
  onRejectCash,
  working,
}) {
  // A customer hired this worker by name. It isn't their job until they say yes,
  // and declining puts the task back on the open list for someone else.
  if (status === "requested") {
    return (
      <>
        <button
          type="button"
          onClick={onDecline}
          disabled={working}
          className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={working}
          className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {working ? "Saving..." : "Accept"}
        </button>
      </>
    );
  }
  // The customer owes a 10% advance before this job is confirmed; until it lands
  // the backend won't let the job be started.
  if (status === "accepted") {
    return (
      <span className="rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold text-violet-700">
        Awaiting customer payment
      </span>
    );
  }
  if (status === "assigned") {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={working}
        className="rounded-full bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {working ? "Starting..." : "Start Task"}
      </button>
    );
  }
  if (status === "in progress") {
    return (
      <button
        type="button"
        onClick={onComplete}
        disabled={working}
        className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {working ? "Completing..." : "Mark Complete"}
      </button>
    );
  }
  // The work is done but the money is not in. A gateway payment settles itself and this
  // row simply turns `completed` on the next load; cash is the case that needs the worker
  // to say whether it actually arrived, because nothing else can know.
  if (status === "awaiting payment") {
    if (!cashDeclared) {
      return (
        <span className="rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-700">
          Awaiting final payment
        </span>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={onRejectCash}
          disabled={working}
          className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Not received
        </button>
        <button
          type="button"
          onClick={onConfirmCash}
          disabled={working}
          className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {working ? "Saving..." : "Confirm cash received"}
        </button>
      </>
    );
  }
  return null;
}

export default function WorkerMyJobs() {
  const [jobs, setJobs] = useState([]);
  const [cashDeclaredIds, setCashDeclaredIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [confirm, confirmDialog] = useConfirm();

  // Every action on this page changes what the customer sees, so each one is asked about
  // first. The job is looked up by id rather than threaded through JobActions, so the
  // confirmation can name the task and its money.
  const jobById = (id) => jobs.find((job) => job.id === id);

  /* A task never says how its balance is being paid, so the earnings payload comes along
     to answer the one question this page needs: is there a cash claim on this job waiting
     for me? Reusing that endpoint keeps the worker off `/payments`, which is customer-only. */
  useEffect(() => {
    Promise.all([listMyJobs(), getMyEarnings()])
      .then(([jobData, earnings]) => {
        setJobs(jobData);
        setCashDeclaredIds(
          new Set(
            (earnings.jobs || [])
              .filter((job) => job.cashDeclared)
              .map((job) => job.taskId),
          ),
        );
      })
      .catch(() => toast.error("Could not load your jobs."))
      .finally(() => setLoading(false));
  }, []);

  /* Accepting keeps the row (it becomes a real job); rejecting hands the task back
     to the open list, so it drops off this worker's list entirely. */
  const handleRespond = async (id, action) => {
    const job = jobById(id);
    const declining = action === "decline";
    const ok = await confirm(
      declining
        ? {
            title: "Reject this request?",
            body: `"${job?.title}" goes back on the open list for another worker, and it leaves your jobs for good.`,
            confirmLabel: "Reject request",
            cancelLabel: "Keep it",
            tone: "danger",
          }
        : {
            title: "Accept this request?",
            body: `You're taking on "${job?.title}" for ${formatMoney(job?.budget)}. It's confirmed once the customer pays their advance.`,
            confirmLabel: "Accept request",
            cancelLabel: "Not yet",
            tone: "emerald",
          },
    );
    if (!ok) return;

    setWorkingId(id);
    try {
      if (action === "accept") {
        const updated = await acceptTask(id);
        setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
        toast.success("Request accepted! It's confirmed once the customer pays their advance.");
      } else {
        await declineTask(id);
        setJobs((prev) => prev.filter((j) => j.id !== id));
        toast.success("Request rejected. The task is back on the open list.");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || `Could not ${action} this request.`,
      );
    } finally {
      setWorkingId(null);
    }
  };

  const handleStart = async (id) => {
    const ok = await confirm({
      title: "Start this task?",
      body: `The customer is told work on "${jobById(id)?.title}" has begun.`,
      confirmLabel: "Start task",
      cancelLabel: "Not yet",
      tone: "primary",
    });
    if (!ok) return;

    setWorkingId(id);
    try {
      const updated = await startTask(id);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      toast.success("Task started.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start this task.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleComplete = async (id) => {
    const job = jobById(id);
    const ok = await confirm({
      title: "Mark this work done?",
      body: `"${job?.title}" is handed over and the customer is asked to settle the ${formatMoney(remainingAfter(job?.budget))} balance. Only do this once the work is finished.`,
      confirmLabel: "Mark complete",
      cancelLabel: "Not yet",
      tone: "emerald",
    });
    if (!ok) return;

    setWorkingId(id);
    try {
      const updated = await completeTask(id);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      toast.success("Work marked done. The job closes once the customer settles up.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete this task.");
    } finally {
      setWorkingId(null);
    }
  };

  /* Both answers come back as the payment, which carries the task it settled — so the row
     can be replaced from the response rather than refetched. Confirming closes the job;
     rejecting only clears the claim, leaving the task awaiting payment. */
  const handleCashAnswer = async (id, received) => {
    const job = jobById(id);
    const details = { title: job?.title, amount: remainingAfter(job?.budget) };
    const ok = await confirm(
      received ? cashReceivedConfirm(details) : cashNotReceivedConfirm(details),
    );
    if (!ok) return;

    setWorkingId(id);
    try {
      const payment = received
        ? await confirmCashPayment(id)
        : await rejectCashPayment(id);
      if (payment.task) {
        setJobs((prev) => prev.map((j) => (j.id === id ? payment.task : j)));
      }
      setCashDeclaredIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(
        received
          ? "Cash confirmed. That job is paid in full."
          : "Recorded. The customer has been asked to pay again.",
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not record your answer.",
      );
    } finally {
      setWorkingId(null);
    }
  };

  const counts = useMemo(() => {
    const tally = { all: jobs.length };
    STATUS_FILTERS.slice(1).forEach(({ key }) => {
      tally[key] = jobs.filter((j) => formatStatus(j.status) === key).length;
    });
    return tally;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (activeFilter === "all") return jobs;
    return jobs.filter((j) => formatStatus(j.status) === activeFilter);
  }, [jobs, activeFilter]);

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <WorkerHeader title="My Jobs" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              My Jobs
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Requests waiting on you, plus the tasks you&apos;ve accepted, are in
              progress, or have finished.
            </p>
          </div>

          <TaskFilterBar
            filters={STATUS_FILTERS}
            active={activeFilter}
            onChange={setActiveFilter}
            counts={counts}
            accent="emerald"
          />

          {loading ? (
            <TaskListSkeleton rows={5} />
          ) : filteredJobs.length === 0 ? (
            <TaskEmptyState
              icon={INBOX_ICON}
              title={
                jobs.length === 0
                  ? "You haven't accepted any jobs yet"
                  : `No ${activeFilter} jobs`
              }
              body={
                jobs.length === 0
                  ? "Head to Browse Tasks to find open work near you."
                  : "Jobs will show up here as they move through this stage."
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {filteredJobs.map((job) => (
                <li key={job.id}>
                  <TaskCard
                    task={job}
                    accent="emerald"
                    party={{
                      role: "Customer",
                      person: job.customer,
                      // No chat on a job the customer has not confirmed with the advance.
                      ...(chatUnlocked(job)
                        ? { messageHref: `/worker/messages?taskId=${job.id}` }
                        : { messageLockedHint: CHAT_LOCKED_HINT }),
                    }}
                    extraDetails={
                      job.hourlyRate != null
                        ? [{ label: "Rate", value: `${formatMoney(job.hourlyRate)}/hr` }]
                        : []
                    }
                    actions={
                      <JobActions
                        status={formatStatus(job.status)}
                        cashDeclared={cashDeclaredIds.has(job.id)}
                        onAccept={() => handleRespond(job.id, "accept")}
                        onDecline={() => handleRespond(job.id, "decline")}
                        onStart={() => handleStart(job.id)}
                        onComplete={() => handleComplete(job.id)}
                        onConfirmCash={() => handleCashAnswer(job.id, true)}
                        onRejectCash={() => handleCashAnswer(job.id, false)}
                        working={workingId === job.id}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {confirmDialog}
    </div>
  );
}
