import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import { acceptTask, listOpenTasks } from "../../api/workerTaskApi";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkerBrowseTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const load = () => {
    listOpenTasks()
      .then(setTasks)
      .catch(() => toast.error("Could not load open tasks."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id) => {
    setAcceptingId(id);
    try {
      await acceptTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task accepted! Check My Jobs to get started.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not accept this task.");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <WorkerHeader title="Browse Tasks" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Browse Open Tasks
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Accept a task to add it to your jobs.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading open tasks...</p>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-600">
                No open tasks right now. Check back soon.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {task.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.location}, {task.city} · Posted {formatDate(task.createdAt)}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {task.description}
                      </p>
                      {task.timePreference && (
                        <p className="mt-2 text-xs text-slate-500">
                          Preferred time: {task.timePreference}
                          {task.dueDate ? ` · Due ${task.dueDate}` : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">
                          NPR {Number(task.budget).toLocaleString()}
                        </p>
                        {task.hourlyRate != null && (
                          <p className="text-xs text-slate-500">
                            or NPR {Number(task.hourlyRate)}/hr
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={acceptingId === task.id}
                        onClick={() => handleAccept(task.id)}
                        className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {acceptingId === task.id ? "Accepting..." : "Accept Task"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
