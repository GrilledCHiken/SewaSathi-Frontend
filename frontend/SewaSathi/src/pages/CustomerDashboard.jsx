import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { getDashboardSummary } from "../api/dashboardApi";
import { listMyTasks } from "../api/taskApi";
import { listWorkers } from "../api/workerApi";

const STATUS_STYLES = {
  "in progress": "bg-sky-100 text-sky-700",
  accepted: "bg-violet-100 text-violet-700",
  assigned: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  open: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-100 text-rose-700",
};

const AVATAR_PALETTE = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
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

function VerifiedBadge() {
  return (
    <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

export default function CustomerDashboard() {
  const [summary, setSummary] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [recommendedWorkers, setRecommendedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      listMyTasks(),
      listWorkers(),
    ])
      .then(([summaryData, tasks, workers]) => {
        setSummary(summaryData);
        setRecentTasks(tasks.slice(0, 4));
        setRecommendedWorkers(workers.slice(0, 3));
      })
      .catch(() => toast.error("Could not load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const stats = summary
    ? [
        {
          label: "Active Tasks",
          value: summary.activeTasks,
          iconBg: "bg-cyan-100",
          iconText: "text-cyan-600",
          icon: (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          ),
        },
        {
          label: "Completed",
          value: summary.completedTasks,
          iconBg: "bg-emerald-100",
          iconText: "text-emerald-600",
          icon: (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          ),
        },
      ]
    : [];

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Welcome back! Here&apos;s what&apos;s happening with your tasks.
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading dashboard...</p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconText}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
                </article>
              ))}
            </div>

            {/* CTA banner */}
            <section className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-brand to-cyan-400 p-6 shadow-lg shadow-brand/20 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <p className="max-w-2xl text-base font-medium leading-relaxed text-white sm:text-lg">
                  Need something done? Post a task and get matched with verified
                  workers in your area within minutes.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
                  <Link
                    to="/dashboard/post-task"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:bg-slate-50"
                  >
                    <span className="text-lg leading-none">+</span>
                    Post a Task
                  </Link>
                  <Link
                    to="/dashboard/workers"
                    className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
                  >
                    Browse Workers
                  </Link>
                </div>
              </div>
            </section>

            {/* Bottom grid */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* Recent tasks */}
              <section className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Recent Tasks</h3>
                  <Link
                    to="/dashboard/tasks"
                    className="text-sm font-semibold text-brand hover:text-brand-dark"
                  >
                    View All →
                  </Link>
                </div>

                {recentTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <p className="text-sm text-slate-600">
                      You haven&apos;t posted any tasks yet.
                    </p>
                    <Link
                      to="/dashboard/post-task"
                      className="mt-3 inline-flex text-sm font-semibold text-brand hover:text-brand-dark"
                    >
                      Post your first task
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recentTasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-900">{task.title}</h4>
                            <p className="mt-1 text-sm text-slate-500">
                              {task.category} · {task.location}, {task.city}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[formatStatus(task.status)]}`}
                              >
                                {formatStatus(task.status)}
                              </span>
                              {task.assignedWorker && (
                                <span className="text-xs text-slate-500">
                                  · {task.assignedWorker.fullName}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="shrink-0 text-base font-bold text-slate-900 sm:text-right">
                            NPR {Number(task.budget).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recommended workers */}
              <section>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Recommended Workers
                  </h3>
                  <Link
                    to="/dashboard/workers"
                    className="text-sm font-semibold text-brand hover:text-brand-dark"
                  >
                    Browse
                  </Link>
                </div>

                {recommendedWorkers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <p className="text-sm text-slate-600">No workers available yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recommendedWorkers.map((worker, index) => {
                      const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
                      const skills = worker.skills
                        ? worker.skills.split(",").map((s) => s.trim()).filter(Boolean)
                        : [];
                      return (
                        <li
                          key={worker.id}
                          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                        >
                          <div className="flex gap-3">
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${palette.bg} ${palette.text}`}
                            >
                              {initialsOf(worker.fullName)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1">
                                  <span className="truncate font-semibold text-slate-900">
                                    {worker.fullName}
                                  </span>
                                  <VerifiedBadge />
                                </div>
                                {worker.hourlyRate != null && (
                                  <span className="shrink-0 text-xs font-semibold text-slate-700">
                                    NPR {Number(worker.hourlyRate)}/hr
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {worker.ratingAverage ?? 0} ({worker.ratingCount ?? 0})
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {skills.slice(0, 3).map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
