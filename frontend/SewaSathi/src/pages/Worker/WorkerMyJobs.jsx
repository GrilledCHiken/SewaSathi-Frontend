import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import { completeTask, listMyJobs, startTask } from "../../api/workerTaskApi";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "assigned", label: "assigned" },
  { key: "in progress", label: "in progress" },
  { key: "completed", label: "completed" },
];

const STATUS_STYLES = {
  assigned: "bg-amber-100 text-amber-700",
  "in progress": "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function formatStatus(status) {
  return status.replace(/_/g, " ").toLowerCase();
}

function JobActions({ status, onStart, onComplete, working }) {
  if (status === "assigned") {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={working}
        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              My Jobs
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Tasks you&apos;ve accepted, in progress, or completed.
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {STATUS_FILTERS.map(({ key, label }) => {
              const count = counts[key] ?? 0;
              const active = activeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={[
                    "rounded-full px-3.5 py-2 text-sm font-medium capitalize transition",
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading your jobs...</p>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-600">
                No jobs match this filter.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredJobs.map((job) => {
                const status = formatStatus(job.status);
                return (
                  <li
                    key={job.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {job.category} · {job.location}, {job.city}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {job.description}
                        </p>
                        {job.customer && (
                          <p className="mt-3 text-sm text-slate-600">
                            Customer:{" "}
                            <span className="font-medium text-slate-800">
                              {job.customer.fullName}
                            </span>{" "}
                            · {job.customer.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <p className="text-lg font-bold text-slate-900">
                          NPR {Number(job.budget).toLocaleString()}
                        </p>
                        <JobActions
                          status={status}
                          onStart={() => handleStart(job.id)}
                          onComplete={() => handleComplete(job.id)}
                          working={workingId === job.id}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
