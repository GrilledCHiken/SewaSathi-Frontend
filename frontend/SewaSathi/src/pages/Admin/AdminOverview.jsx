import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import AnalyticsWidget from "../../components/Admin/AnalyticsWidget";
import { getOverview } from "../../api/adminApi";

function UsersIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function UserIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverview()
      .then(setOverview)
      .catch(() => toast.error("Could not load overview stats."))
      .finally(() => setLoading(false));
  }, []);

  const stats = overview
    ? [
        {
          label: "Total Users",
          value: overview.totalUsers,
          iconBg: "bg-sky-100",
          iconText: "text-sky-600",
          icon: <UsersIcon />,
        },
        {
          label: "Workers",
          value: overview.totalWorkers,
          iconBg: "bg-emerald-100",
          iconText: "text-emerald-600",
          icon: <BriefcaseIcon />,
        },
        {
          label: "Customers",
          value: overview.totalCustomers,
          iconBg: "bg-violet-100",
          iconText: "text-violet-600",
          icon: <UserIcon />,
        },
        {
          label: "Pending Verifications",
          value: overview.pendingVerifications,
          iconBg: "bg-amber-100",
          iconText: "text-amber-600",
          icon: <ShieldIcon />,
          hint: overview.pendingVerifications > 0 ? "Needs attention" : undefined,
        },
      ]
    : [];

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Admin Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Platform overview and key metrics.
          </p>
        </div>

        {loading && <p className="mt-6 text-sm text-slate-500">Loading overview...</p>}

        {overview && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    {stat.hint && (
                      <span className="text-xs font-semibold text-amber-600">{stat.hint}</span>
                    )}
                  </div>
                  <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AnalyticsWidget />
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">Quick Actions</h3>
                <div className="space-y-1">
                  <Link
                    to="/admin/verifications"
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <span className="flex items-center gap-3">
                      <ShieldIcon />
                      Review Verifications
                    </span>
                    {overview.pendingVerifications > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {overview.pendingVerifications}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/users"
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <span className="flex items-center gap-3">
                      <UsersIcon />
                      Manage Users
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {overview.totalUsers}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
