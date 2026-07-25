import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { cancelTask, listMyTasks } from "../api/taskApi";
import { listReviewableTasks } from "../api/reviewApi";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "open" },
  { key: "assigned", label: "assigned" },
  { key: "in progress", label: "in progress" },
  { key: "completed", label: "completed" },
  { key: "cancelled", label: "cancelled" },
];

const STATUS_STYLES = {
  "in progress": {
    badge: "bg-sky-100 text-sky-700",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  assigned: {
    badge: "bg-amber-100 text-amber-700",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  open: {
    badge: "bg-slate-100 text-slate-600",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  cancelled: {
    badge: "bg-rose-100 text-rose-700",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
  },
};

const AVATAR_PALETTE = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
];

function initialsOf(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatStatus(status) {
  return status.replace(/_/g, " ").toLowerCase();
}

function mapTask(task) {
  const palette = AVATAR_PALETTE[task.id % AVATAR_PALETTE.length];
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    location: [task.location, task.city].filter(Boolean).join(", "),
    description: task.description,
    status: formatStatus(task.status),
    price: `NPR ${Number(task.budget).toLocaleString()}`,
    worker: task.assignedWorker
      ? {
          name: task.assignedWorker.fullName,
          initials: initialsOf(task.assignedWorker.fullName),
          avatarBg: palette.bg,
          avatarText: palette.text,
        }
      : null,
    posted: task.createdAt ? task.createdAt.slice(0, 10) : "",
    due: task.dueDate || "Flexible",
  };
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style.badge}`}
    >
      {style.icon}
      {status}
    </span>
  );
}

function TaskActions({ status, taskId, canReview, onCancel, canceling }) {
  switch (status) {
    case "in progress":
      return (
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white opacity-60"
        >
          Mark Complete
        </button>
      );
    case "assigned":
      return (
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white opacity-60"
        >
          Start Task
        </button>
      );
    case "completed":
      return canReview ? (
        <Link
          to={`/dashboard/reviews?taskId=${taskId}`}
          className="rounded-full border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
        >
          Leave Review
        </Link>
      ) : (
        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-400">
          Reviewed
        </span>
      );
    case "open":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={canceling}
            className="text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {canceling ? "Cancelling..." : "Cancel Task"}
          </button>
        </div>
      );
    default:
      return null;
  }
}

function TaskCard({ task, canReview, onCancel, canceling }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
            <StatusBadge status={task.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {task.category} · {task.location}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {task.description}
          </p>

          {task.worker && (
            <div className="mt-4 flex items-center gap-2.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${task.worker.avatarBg} ${task.worker.avatarText}`}
              >
                {task.worker.initials}
              </span>
              <span className="text-sm text-slate-600">
                Assigned to{" "}
                <span className="font-medium text-slate-800">
                  {task.worker.name}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-start justify-between gap-4 sm:flex-col sm:items-end lg:text-right">
          <p className="text-lg font-bold text-slate-900">{task.price}</p>
          <div className="text-xs text-slate-500 sm:text-sm">
            <p>Posted {task.posted}</p>
            <p className="mt-0.5">Due {task.due}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <TaskActions
          status={task.status}
          taskId={task.id}
          canReview={canReview}
          onCancel={onCancel}
          canceling={canceling}
        />
      </div>
    </article>
  );
}

export default function CustomerMyTask() {
  const [tasks, setTasks] = useState([]);
  const [reviewableTaskIds, setReviewableTaskIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");

  useEffect(() => {
    Promise.all([listMyTasks(), listReviewableTasks()])
      .then(([taskData, reviewable]) => {
        setTasks(taskData.map(mapTask));
        setReviewableTaskIds(new Set(reviewable.map((t) => t.id)));
      })
      .catch(() => toast.error("Could not load your tasks."))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    setCancelingId(id);
    try {
      const updated = await cancelTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? mapTask(updated) : t)));
      toast.success("Task cancelled.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel this task.");
    } finally {
      setCancelingId(null);
    }
  };

  const counts = useMemo(() => {
    const tally = { all: tasks.length };
    STATUS_FILTERS.slice(1).forEach(({ key }) => {
      tally[key] = tasks.filter((t) => t.status === key).length;
    });
    return tally;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesFilter =
        activeFilter === "all" || task.status === activeFilter;
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query) ||
        task.location.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [tasks, activeFilter, taskSearch]);

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              My Tasks
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Manage and track all your posted tasks.
            </p>
          </div>

          {/* Filters + task search */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
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
                        ? "bg-brand text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:max-w-xs">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                aria-label="Search tasks"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading your tasks...</p>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-600">
                No tasks match your filters.
              </p>
              <Link
                to="/dashboard/post-task"
                className="mt-4 inline-flex text-sm font-semibold text-brand hover:text-brand-dark"
              >
                Post a new task
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    canReview={reviewableTaskIds.has(task.id)}
                    onCancel={() => handleCancel(task.id)}
                    canceling={cancelingId === task.id}
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
