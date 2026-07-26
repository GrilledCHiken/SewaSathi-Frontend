import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import TaskCard from "../../components/tasks/TaskCard";
import TaskEmptyState from "../../components/tasks/TaskEmptyState";
import TaskFilterBar from "../../components/tasks/TaskFilterBar";
import TaskListSkeleton from "../../components/tasks/TaskListSkeleton";
import {
  INBOX_ICON,
  SEARCH_ICON,
  formatLocation,
  formatMoney,
} from "../../components/tasks/taskUi";
import { acceptTask, listOpenTasks } from "../../api/workerTaskApi";

export default function WorkerBrowseTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listOpenTasks()
      .then(setTasks)
      .catch(() => toast.error("Could not load open tasks."))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    setAcceptingId(id);
    try {
      await acceptTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success(
        "Task accepted! It's confirmed once the customer pays their advance.",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not accept this task.");
    } finally {
      setAcceptingId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [task.title, task.category, formatLocation(task), task.description]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query)),
    );
  }, [tasks, search]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <WorkerHeader title="Browse Tasks" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Browse Open Tasks
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Accept a task to add it to your jobs.
            </p>
          </div>

          <TaskFilterBar
            search={search}
            onSearchChange={setSearch}
            accent="emerald"
            searchPlaceholder="Search open tasks..."
          />

          {loading ? (
            <TaskListSkeleton rows={5} />
          ) : filteredTasks.length === 0 ? (
            <TaskEmptyState
              icon={isSearching ? SEARCH_ICON : INBOX_ICON}
              title={
                isSearching ? "No tasks match your search" : "No open tasks right now"
              }
              body={
                isSearching
                  ? `Nothing matched "${search.trim()}". Try a different keyword.`
                  : "New tasks appear here as customers post them. Check back soon."
              }
              action={
                isSearching ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Clear search
                  </button>
                ) : (
                  <Link
                    to="/worker/jobs"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    View my jobs
                  </Link>
                )
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {filteredTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    accent="emerald"
                    showStatus={false}
                    extraDetails={
                      task.hourlyRate != null
                        ? [{ label: "Rate", value: `${formatMoney(task.hourlyRate)}/hr` }]
                        : []
                    }
                    actions={
                      <button
                        type="button"
                        disabled={acceptingId === task.id}
                        onClick={() => handleAccept(task.id)}
                        className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {acceptingId === task.id ? "Accepting..." : "Accept Task"}
                      </button>
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
