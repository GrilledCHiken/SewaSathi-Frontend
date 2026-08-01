import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import TaskCard from "../components/tasks/TaskCard";
import TaskEmptyState from "../components/tasks/TaskEmptyState";
import TaskFilterBar from "../components/tasks/TaskFilterBar";
import TaskListSkeleton from "../components/tasks/TaskListSkeleton";
import {
  ADVANCE_PERCENT_LABEL,
  CHAT_LOCKED_HINT,
  INBOX_ICON,
  SEARCH_ICON,
  advanceFor,
  chatUnlocked,
  formatLocation,
  formatMoney,
  formatStatus,
} from "../components/tasks/taskUi";
import { cancelTask, listMyTasks } from "../api/taskApi";
import { listReviewableTasks } from "../api/reviewApi";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { PlusIcon } from "../components/ui/icons";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "open" },
  { key: "requested", label: "requested" },
  { key: "accepted", label: "accepted" },
  { key: "assigned", label: "assigned" },
  { key: "in progress", label: "in progress" },
  { key: "completed", label: "completed" },
  { key: "cancelled", label: "cancelled" },
];

function AdvanceNotice({ count }) {
  return (
    <Alert tone="warning" className="mb-4" role="status">
      <span className="font-semibold">
        {count === 1
          ? "A worker accepted your task."
          : `${count} of your tasks have been accepted.`}
      </span>{" "}
      You need to pay a {ADVANCE_PERCENT_LABEL} advance to confirm the booking and lock
      in your worker. The rest is due once the work is completed.
    </Alert>
  );
}

/**
 * Kept visible rather than hidden so the rule is legible right where a customer would
 * reach for it. The span carries the tooltip because a disabled Button has no pointer
 * events of its own.
 */
function LockedMessageButton() {
  return (
    <span title={CHAT_LOCKED_HINT} className="inline-flex">
      <Button size="xs" variant="secondary" disabled>
        Message
      </Button>
    </span>
  );
}

function TaskActions({ task, status, canReview, onCancel, canceling }) {
  switch (status) {
    // Hired directly but not answered yet. Deliberately no Pay button - the
    // backend refuses an advance until the worker has said yes.
    case "requested":
      return (
        <>
          <span className="rounded-full border border-warning/30 bg-warning-soft px-3.5 py-1.5 text-xs font-semibold text-warning-ink">
            Waiting for worker
          </span>
          <LockedMessageButton />
          <Button
            size="xs"
            variant="ghost"
            onClick={onCancel}
            loading={canceling}
            className="text-danger hover:bg-danger-soft hover:text-danger-ink"
          >
            {canceling ? "Cancelling..." : "Cancel"}
          </Button>
        </>
      );
    // Paying the advance is the only thing to do here, so it takes the primary
    // slot that Message occupies once the task is confirmed.
    case "accepted":
      return (
        <>
          <Button as={Link} to={`/dashboard/checkout/${task.id}`} size="xs">
            Pay For Confirmation
          </Button>
          <LockedMessageButton />
        </>
      );
    case "assigned":
    case "in progress":
      return task.assignedWorker ? (
        <Button
          as={Link}
          to={`/dashboard/messages?taskId=${task.id}`}
          size="xs"
          variant="secondary"
        >
          Message
        </Button>
      ) : null;
    case "completed":
      return canReview ? (
        <Button
          as={Link}
          to={`/dashboard/reviews?taskId=${task.id}`}
          size="xs"
          variant="secondary"
          className="border-brand text-brand"
        >
          Leave Review
        </Button>
      ) : (
        <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-faint">
          Reviewed
        </span>
      );
    case "open":
      return (
        <Button
          size="xs"
          variant="ghost"
          onClick={onCancel}
          loading={canceling}
          className="text-danger hover:bg-danger-soft hover:text-danger-ink"
        >
          {canceling ? "Cancelling..." : "Cancel"}
        </Button>
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
    <PageShell
      header={<DashboardHeader title="My Tasks" searchPlaceholder="Search workers..." />}
      width="md"
    >
      <div className="mb-5">
        <PageHeader
          title="My Tasks"
          description="Manage and track all your posted tasks."
          actions={
            <Button
              as={Link}
              to="/dashboard/post-task"
              iconLeft={<PlusIcon className="h-4 w-4" />}
            >
              Post a Task
            </Button>
          }
        />
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
              <Button variant="quiet" size="sm" onClick={() => setTaskSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button as={Link} to="/dashboard/post-task">
                Post a new task
              </Button>
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
                          status === "requested"
                            ? "Hasn't answered your request yet"
                            : status === "accepted"
                              ? "Awaiting your advance payment"
                              : "Assigned worker",
                        person: task.assignedWorker,
                        emptyLabel:
                          status === "open"
                            ? "Waiting for a worker to accept"
                            : status === "accepted"
                              ? "Pay the advance to confirm"
                              : undefined,
                        // Chat opens once the advance is paid, so the link stays dead
                        // while the booking is still unconfirmed.
                        ...(chatUnlocked(task)
                          ? { messageHref: `/dashboard/messages?taskId=${task.id}` }
                          : { messageLockedHint: CHAT_LOCKED_HINT }),
                      }}
                      extraDetails={
                        status === "accepted"
                          ? [
                              {
                                label: `Advance due (${ADVANCE_PERCENT_LABEL})`,
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
    </PageShell>
  );
}
