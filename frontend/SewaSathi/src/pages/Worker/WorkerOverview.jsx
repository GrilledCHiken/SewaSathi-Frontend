import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import { listMyJobs, listOpenTasks } from "../../api/workerTaskApi";
import { getMyWorkerProfile } from "../../api/workerProfileApi";

const ACTIVE_STATUSES = ["ASSIGNED", "IN_PROGRESS"];

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

export default function WorkerOverview() {
  const [loading, setLoading] = useState(true);
  const [openCount, setOpenCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    Promise.all([listOpenTasks(), listMyJobs(), getMyWorkerProfile()])
      .then(([openTasks, myJobs, profile]) => {
        setOpenCount(openTasks.length);
        setActiveCount(myJobs.filter((t) => ACTIVE_STATUSES.includes(t.status)).length);
        setCompletedCount(myJobs.filter((t) => t.status === "COMPLETED").length);
        setProfileIncomplete(!profile.skills || !profile.location || !profile.hourlyRate);
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
    {
      label: "Active Jobs",
      value: activeCount,
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
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

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
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
                </article>
              ))}
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
