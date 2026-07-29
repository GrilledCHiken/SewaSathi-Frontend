import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { getDashboardSummary } from "../api/dashboardApi";
import { listMyTasks } from "../api/taskApi";
import { listWorkers } from "../api/workerApi";
import PageShell from "../components/ui/PageShell";
import { Panel } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import EmptyState from "../components/ui/EmptyState";
import Skeleton, { SkeletonCard } from "../components/ui/Skeleton";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
  VerifiedIcon,
} from "../components/ui/icons";
import {
  formatMoney,
  formatStatus,
  initialsOf,
  paletteFor,
  statusMeta,
} from "../components/tasks/taskUi.jsx";

/**
 * Customer overview.
 *
 * Restructured rather than restyled. The old layout led with two stat tiles in
 * a grid built for more, which left the top of the page looking half-finished,
 * and buried the primary call to action below them. Now the gradient band leads
 * and carries the greeting, the stats row is a balanced three-up (two real
 * figures plus a browse action — no invented numbers), and the two columns
 * below sit in proper panels.
 */

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your dashboard">
      <Skeleton className="h-40 w-full" rounded="rounded-panel" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2" lines={4} showTile={false} />
        <SkeletonCard lines={4} showTile={false} />
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const status = formatStatus(task.status);
  const meta = statusMeta(status);

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold text-ink">{task.title}</h4>
        <p className="mt-1 truncate text-sm text-ink-muted">
          {task.category} · {task.location}, {task.city}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone} dot pulse={meta.pulse}>
            {status}
          </Badge>
          {task.assignedWorker && (
            <span className="text-xs text-ink-muted">
              · {task.assignedWorker.fullName}
            </span>
          )}
        </div>
      </div>
      <p className="shrink-0 text-base font-bold tabular-nums text-ink sm:text-right">
        {formatMoney(task.budget)}
      </p>
    </li>
  );
}

function WorkerRow({ worker }) {
  const palette = paletteFor(worker.id);
  const skills = worker.skills
    ? worker.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${palette.bg} ${palette.text}`}
      >
        {initialsOf(worker.fullName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-semibold text-ink">
              {worker.fullName}
            </span>
            <VerifiedIcon className="h-4 w-4 shrink-0 text-brand" />
          </div>
          {worker.hourlyRate != null && (
            <span className="shrink-0 text-xs font-bold tabular-nums text-ink-body">
              {formatMoney(worker.hourlyRate)}/hr
            </span>
          )}
        </div>

        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
          <StarIcon className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-semibold text-ink-body">
            {worker.ratingAverage ?? 0}
          </span>
          ({worker.ratingCount ?? 0})
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

export default function CustomerDashboard() {
  const [summary, setSummary] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [recommendedWorkers, setRecommendedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardSummary(), listMyTasks(), listWorkers()])
      .then(([summaryData, tasks, workers]) => {
        setSummary(summaryData);
        setRecentTasks(tasks.slice(0, 4));
        setRecommendedWorkers(workers.slice(0, 3));
      })
      .catch(() => toast.error("Could not load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell header={<DashboardHeader title="Dashboard" searchPlaceholder="Search workers..." />}>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Hero band. Leads the page so the primary action is above the
              fold, and absorbs the greeting that used to sit above it. */}
          <section className="relative overflow-hidden rounded-panel bg-gradient-to-br from-brand-600 via-brand to-cyan-400 p-6 shadow-brand sm:p-8">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-200/25 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Welcome back
                </h2>
                <p className="mt-2 text-base leading-relaxed text-white/90">
                  Need something done? Post a task and get matched with verified
                  workers in your area within minutes.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
                <Button
                  as={Link}
                  to="/dashboard/post-task"
                  variant="onBrand"
                  size="lg"
                  iconLeft={<PlusIcon className="h-5 w-5" />}
                >
                  Post a Task
                </Button>
                <Button
                  as={Link}
                  to="/dashboard/workers"
                  variant="outlineOnBrand"
                  size="lg"
                >
                  Browse Workers
                </Button>
              </div>
            </div>
          </section>

          {/* Three equal cells: two real figures and a navigation card. No
              fabricated third statistic just to fill the row. */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="Active Tasks"
              value={summary?.activeTasks ?? 0}
              tone="info"
              to="/dashboard/tasks"
              icon={<ClipboardIcon className="h-6 w-6" />}
            />
            <StatTile
              label="Completed"
              value={summary?.completedTasks ?? 0}
              tone="success"
              to="/dashboard/tasks"
              icon={<CheckCircleIcon className="h-6 w-6" />}
            />

            <Link
              to="/dashboard/workers"
              className="group flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-e1 transition duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-e2 motion-reduce:hover:translate-y-0 focus-ring sm:col-span-2 lg:col-span-1"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-field bg-brand-50 text-brand">
                <UsersIcon className="h-6 w-6" />
              </span>
              <div className="mt-4">
                <p className="font-bold text-ink">Find a worker</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Browse verified professionals near you.
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                  Browse workers
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              title="Recent Tasks"
              action={
                <Button as={Link} to="/dashboard/tasks" variant="quiet" size="sm">
                  View all
                </Button>
              }
              padding={recentTasks.length === 0 ? "none" : "md"}
            >
              {recentTasks.length === 0 ? (
                <EmptyState
                  tone="bare"
                  icon={<ClipboardIcon className="h-6 w-6" />}
                  title="No tasks yet"
                  body="Post your first task and start getting offers from verified workers."
                  action={
                    <Button as={Link} to="/dashboard/post-task" size="sm">
                      Post your first task
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {recentTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Recommended Workers"
              action={
                <Button as={Link} to="/dashboard/workers" variant="quiet" size="sm">
                  Browse
                </Button>
              }
              padding={recommendedWorkers.length === 0 ? "none" : "md"}
            >
              {recommendedWorkers.length === 0 ? (
                <EmptyState
                  tone="bare"
                  icon={<UsersIcon className="h-6 w-6" />}
                  title="No workers available yet"
                  body="Check back shortly — new professionals join every week."
                />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {recommendedWorkers.map((worker) => (
                    <WorkerRow key={worker.id} worker={worker} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </PageShell>
  );
}
