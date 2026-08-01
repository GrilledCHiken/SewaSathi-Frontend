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
} from "../../components/tasks/taskUi";
import {
  acceptTask,
  completeTask,
  declineTask,
  listMyJobs,
  startTask,
} from "../../api/workerTaskApi";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "requested", label: "requested" },
  { key: "accepted", label: "accepted" },
  { key: "assigned", label: "assigned" },
  { key: "in progress", label: "in progress" },
  { key: "completed", label: "completed" },
];

function JobActions({ status, onAccept, onDecline, onStart, onComplete, working }) {
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
  return null;
}

export default function WorkerMyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    listMyJobs()
      .then(setJobs)
      .catch(() => toast.error("Could not load your jobs."))
      .finally(() => setLoading(false));
  }, []);

  /* Accepting keeps the row (it becomes a real job); rejecting hands the task back
     to the open list, so it drops off this worker's list entirely. */
  const handleRespond = async (id, action) => {
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
    setWorkingId(id);
    try {
      const updated = await completeTask(id);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      toast.success("Task marked complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not complete this task.");
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
              progress, or have completed.
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
                        onAccept={() => handleRespond(job.id, "accept")}
                        onDecline={() => handleRespond(job.id, "decline")}
                        onStart={() => handleStart(job.id)}
                        onComplete={() => handleComplete(job.id)}
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
    </div>
  );
}
