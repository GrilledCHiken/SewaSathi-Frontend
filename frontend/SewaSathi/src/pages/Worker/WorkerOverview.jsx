import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import { formatMoney } from "../../components/tasks/taskUi";
import { listMyJobs, listOpenTasks } from "../../api/workerTaskApi";
import { getMyWorkerProfile } from "../../api/workerProfileApi";
import { getMyEarnings } from "../../api/workerEarningsApi";

// AWAITING_PAYMENT is still active: the work is done but the job is not closed until the
// customer settles up, and on cash that needs an answer from this worker.
const ACTIVE_STATUSES = [
  "ACCEPTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "AWAITING_PAYMENT",
];

function SearchIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export default function WorkerOverview() {
  const [loading, setLoading] = useState(true);
  const [openCount, setOpenCount] = useState(0);
  const [requestedCount, setRequestedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    Promise.all([
      listOpenTasks(),
      listMyJobs(),
      getMyWorkerProfile(),
      getMyEarnings(),
    ])
      .then(([openTasks, myJobs, profile, earningsData]) => {
        setOpenCount(openTasks.length);
        setRequestedCount(myJobs.filter((t) => t.status === "REQUESTED").length);
        setActiveCount(myJobs.filter((t) => ACTIVE_STATUSES.includes(t.status)).length);
        setCompletedCount(myJobs.filter((t) => t.status === "COMPLETED").length);
        setProfileIncomplete(!profile.skills || !profile.location || !profile.hourlyRate);
        setEarnings(earningsData);
      })
      .catch(() => toast.error("Could not load your overview."))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Open Tasks Available",
      value: openCount,
      iconBg: "bg-sky-100",
      iconText: "text-sky-600",
      icon: <SearchIcon />,
    },
    // Customers who hired this worker by name and are waiting on an answer. The only tile
    // that asks the worker to do something, so it is the only one that links anywhere.
    {
      label: "Job Requests",
      value: requestedCount,
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      icon: <InboxIcon />,
      to: "/worker/jobs",
      urgent: requestedCount > 0,
    },
    {
      label: "Active Jobs",
      value: activeCount,
      // Violet, matching the `accepted` badge in taskUi - amber now belongs to `requested`.
      iconBg: "bg-violet-100",
      iconText: "text-violet-600",
      icon: <BriefcaseIcon />,
    },
    {
      label: "Completed Jobs",
      value: completedCount,
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      icon: <CheckIcon />,
    },
  ];

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <WorkerHeader />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Welcome back!
          </h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Here&apos;s what&apos;s happening with your jobs.
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading overview...</p>
        ) : (
          <>
            {profileIncomplete && (
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-amber-800">
                  Your profile is missing skills, rate, or location — customers can&apos;t find
                  you in search until it&apos;s complete.
                </p>
                <Link
                  to="/worker/profile"
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Complete Profile
                </Link>
              </div>
            )}

            {/* Money gets its own full-width card rather than a fifth tile in the grid
                below: it is the headline number on this page, and it is a currency
                figure sitting among four plain counts. */}
            {earnings && (
              <Link
                to="/worker/earnings"
                className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 transition hover:border-emerald-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Lifetime Earnings
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-emerald-900 sm:text-4xl">
                    {formatMoney(earnings.lifetimeEarned)}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {formatMoney(earnings.received)} received across{" "}
                    {earnings.jobsCompleted} completed job
                    {earnings.jobsCompleted === 1 ? "" : "s"}
                  </p>
                </div>

                {/* A cash claim outranks the outstanding total: that one is somebody
                    else's move, this one is waiting on the worker reading it. */}
                {earnings.jobsAwaitingCashConfirmation > 0 ? (
                  <div className="shrink-0 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-right ring-2 ring-orange-200">
                    <p className="text-lg font-bold tabular-nums text-orange-800">
                      {earnings.jobsAwaitingCashConfirmation}
                    </p>
                    <p className="text-xs font-medium text-orange-700">
                      cash payment
                      {earnings.jobsAwaitingCashConfirmation === 1 ? "" : "s"} to confirm
                    </p>
                  </div>
                ) : (
                  Number(earnings.outstanding) > 0 && (
                    <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-right">
                      <p className="text-lg font-bold tabular-nums text-amber-800">
                        {formatMoney(earnings.outstanding)}
                      </p>
                      <p className="text-xs font-medium text-amber-700">
                        awaiting final payment
                      </p>
                    </div>
                  )
                )}
              </Link>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                // A tile with somewhere to go becomes a link; the rest stay plain cards.
                const Tile = stat.to ? Link : "article";
                return (
                  <Tile
                    key={stat.label}
                    {...(stat.to ? { to: stat.to } : {})}
                    className={`block rounded-2xl border bg-white p-5 shadow-sm transition ${
                      stat.urgent
                        ? "border-amber-300 ring-2 ring-amber-200 hover:border-amber-400"
                        : "border-slate-200/80"
                    } ${stat.to ? "hover:shadow-md" : ""}`}
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconText}`}
                    >
                      {stat.icon}
                    </span>
                    <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
                    {stat.urgent && (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Waiting on your response
                      </p>
                    )}
                  </Tile>
                );
              })}
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 p-6 shadow-lg shadow-emerald-600/20 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <p className="max-w-2xl text-base font-medium leading-relaxed text-white sm:text-lg">
                  Ready to earn? Browse open tasks near you and accept the ones
                  that match your skills.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
                  <Link
                    to="/worker/tasks"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Browse Tasks
                  </Link>
                  <Link
                    to="/worker/jobs"
                    className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
                  >
                    View My Jobs
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
