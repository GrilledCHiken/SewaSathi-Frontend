import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import TaskCard from "../components/tasks/TaskCard";
import TaskEmptyState from "../components/tasks/TaskEmptyState";
import TaskFilterBar from "../components/tasks/TaskFilterBar";
import TaskListSkeleton from "../components/tasks/TaskListSkeleton";
import {
  ADVANCE_RATE,
  INBOX_ICON,
  SEARCH_ICON,
  advanceFor,
  formatLocation,
  formatMoney,
  formatStatus,
} from "../components/tasks/taskUi";
import { cancelTask, listMyTasks } from "../api/taskApi";
import { listReviewableTasks } from "../api/reviewApi";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "open" },
  { key: "accepted", label: "accepted" },
  { key: "assigned", label: "assigned" },
  { key: "in progress", label: "in progress" },
  { key: "completed", label: "completed" },
  { key: "cancelled", label: "cancelled" },
];

const ADVANCE_PERCENT = `${Math.round(ADVANCE_RATE * 100)}%`;

function AdvanceNotice({ count }) {
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
      role="status"
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <p>
        <span className="font-semibold">
          {count === 1
            ? "A worker accepted your task."
            : `${count} of your tasks have been accepted.`}
        </span>{" "}
        You need to pay a {ADVANCE_PERCENT} advance to confirm the booking and lock
        in your worker. The rest is due once the work is completed.
      </p>
    </div>
  );
}

function TaskActions({ task, status, canReview, onCancel, canceling }) {
  switch (status) {
    // Paying the advance is the only thing to do here, so it takes the primary
    // slot that Message occupies once the task is confirmed.
    case "accepted":
      return (
        <Link
          to={`/dashboard/checkout/${task.id}`}
          className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-dark"
        >
          Pay For Confirmation
        </Link>
      );
    case "assigned":
    case "in progress":
      return task.assignedWorker ? (
        <Link
          to={`/dashboard/messages?taskId=${task.id}`}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand/30 hover:text-brand"
        >
          Message
        </Link>
      ) : null;
    case "completed":
      return canReview ? (
        <Link
          to={`/dashboard/reviews?taskId=${task.id}`}
          className="rounded-full border border-brand bg-white px-3.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/5"
        >
          Leave Review
        </Link>
      ) : (
        <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-400">
          Reviewed
        </span>
      );
    case "open":
      return (
        <button
          type="button"
          onClick={onCancel}
          disabled={canceling}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canceling ? "Cancelling..." : "Cancel"}
        </button>
      );
    default:
      return null;
  }
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
        setTasks(taskData);
        setReviewableTaskIds(new Set(reviewable.map((t) => t.id)));
      })
      .catch(() => toast.error("Could not load your tasks."))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    setCancelingId(id);
    try {
      const updated = await cancelTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
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
      tally[key] = tasks.filter((t) => formatStatus(t.status) === key).length;
    });
    return tally;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesFilter =
        activeFilter === "all" || formatStatus(task.status) === activeFilter;
      const matchesSearch =
        !query ||
        [task.title, task.category, formatLocation(task), task.description]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [tasks, activeFilter, taskSearch]);

  const isSearching = taskSearch.trim().length > 0;
  const hasNoTasksAtAll = tasks.length === 0;
  const awaitingAdvance = counts.accepted || 0;

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              My Tasks
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Manage and track all your posted tasks.
            </p>
          </div>

          {awaitingAdvance > 0 && <AdvanceNotice count={awaitingAdvance} />}

          <TaskFilterBar
            filters={STATUS_FILTERS}
            active={activeFilter}
            onChange={setActiveFilter}
            counts={counts}
            search={taskSearch}
            onSearchChange={setTaskSearch}
            accent="brand"
          />

          {loading ? (
            <TaskListSkeleton rows={5} />
          ) : filteredTasks.length === 0 ? (
            <TaskEmptyState
              icon={isSearching ? SEARCH_ICON : INBOX_ICON}
              title={
                isSearching
                  ? "No tasks match your search"
                  : hasNoTasksAtAll
                    ? "You haven't posted any tasks yet"
                    : `No ${activeFilter} tasks`
              }
              body={
                isSearching
                  ? `Nothing matched "${taskSearch.trim()}". Try a different keyword.`
                  : hasNoTasksAtAll
                    ? "Post your first task and workers nearby can start accepting it."
                    : "Tasks will show up here as they move through this stage."
              }
              action={
                isSearching ? (
                  <button
                    type="button"
                    onClick={() => setTaskSearch("")}
                    className="text-sm font-semibold text-brand hover:text-brand-dark"
                  >
                    Clear search
                  </button>
                ) : (
                  <Link
                    to="/dashboard/post-task"
                    className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                  >
                    Post a new task
                  </Link>
                )
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {filteredTasks.map((task) => {
                const status = formatStatus(task.status);
                return (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      accent="brand"
                      party={{
                        role:
                          status === "accepted"
                            ? "Awaiting your advance payment"
                            : "Assigned worker",
                        person: task.assignedWorker,
                        emptyLabel:
                          status === "open"
                            ? "Waiting for a worker to accept"
                            : status === "accepted"
                              ? "Pay the advance to confirm"
                              : undefined,
                        // Chat opens once the booking is confirmed, so no Message
                        // link while the advance is still outstanding.
                        messageHref:
                          status === "accepted"
                            ? undefined
                            : `/dashboard/messages?taskId=${task.id}`,
                      }}
                      extraDetails={
                        status === "accepted"
                          ? [
                              {
                                label: `Advance due (${ADVANCE_PERCENT})`,
                                value: formatMoney(advanceFor(task.budget)),
                              },
                            ]
                          : []
                      }
                      actions={
                        <TaskActions
                          task={task}
                          status={status}
                          canReview={reviewableTaskIds.has(task.id)}
                          onCancel={() => handleCancel(task.id)}
                          canceling={cancelingId === task.id}
                        />
                      }
                    />
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
