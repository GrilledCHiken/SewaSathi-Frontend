import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import {
  formatCount,
  formatDate,
  formatMoney,
  isoYearsAgo,
  todayIso,
} from "../../components/Admin/analyticsFormat";
import { downloadReport, getAnalytics, listReports } from "../../api/adminApi";

function ClipboardIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 13h3" />
    </svg>
  );
}

function PercentIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

/** A ranked list drawn as bars sized against the busiest entry in that list. */
function BreakdownCard({ title, caption, rows, emptyLabel, barClass }) {
  const busiest = rows.reduce((max, row) => Math.max(max, row.taskCount), 0);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-800">
                  <span className="mr-2 text-xs font-semibold text-slate-400">
                    {index + 1}
                  </span>
                  {row.label}
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatCount(row.taskCount)}
                  <span className="ml-1 text-xs font-medium text-slate-500">
                    {row.taskCount === 1 ? "task" : "tasks"}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  // Widths come from live counts, so they cannot be expressed as
                  // Tailwind classes.
                  style={{ width: `${busiest ? (row.taskCount / busiest) * 100 : 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatMoney(row.totalValue)} in task value
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function AdminAnalytics() {
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  // Default to the last full year so a fresh install still has something in range.
  const [from, setFrom] = useState(isoYearsAgo(1));
  const [to, setTo] = useState(todayIso());
  // Keyed by `${slug}:${format}` so only the button actually clicked shows progress.
  const [busy, setBusy] = useState(null);

  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  // Bumped by Refresh, so re-reading the same range still re-runs the fetch effect.
  const [reloadToken, setReloadToken] = useState(0);

  const rangeInvalid = Boolean(from && to && from > to);
  // An invalid range fetches nothing, so a pending flag left over from the edit that broke
  // the range must not read as "loading"; it clears when the range is fixed and refetches.
  const refreshing = loadingAnalytics && !rangeInvalid;

  /**
   * Moves one end of the range. The pending flag is raised here rather than inside the fetch
   * effect, which must not set state synchronously.
   */
  function changeRange(setter) {
    return (event) => {
      setter(event.target.value);
      setLoadingAnalytics(true);
    };
  }

  function refresh() {
    setReloadToken((token) => token + 1);
    setLoadingAnalytics(true);
  }

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => toast.error("Could not load the report list."))
      .finally(() => setLoadingReports(false));
  }, []);

  // Re-reads the figures whenever the range changes, and whenever Refresh bumps the token.
  // The `current` guard drops a response that lands after a newer range has been requested,
  // which would otherwise leave the tiles showing an older window than the inputs.
  useEffect(() => {
    if (rangeInvalid) return undefined;

    let current = true;
    getAnalytics({ from, to })
      .then((data) => {
        if (!current) return;
        setAnalytics(data);
        setAnalyticsError(false);
      })
      .catch(() => {
        if (current) setAnalyticsError(true);
      })
      .finally(() => {
        if (current) setLoadingAnalytics(false);
      });

    return () => {
      current = false;
    };
  }, [from, to, rangeInvalid, reloadToken]);

  async function handleDownload(report, format) {
    setBusy(`${report.slug}:${format}`);
    try {
      // Point-in-time reports ignore the range server-side; sending it anyway would
      // wrongly imply it had been applied.
      await downloadReport(
        report.slug,
        format,
        report.dateRanged ? { from, to } : {},
      );
    } catch {
      toast.error("Could not generate that report.");
    } finally {
      setBusy(null);
    }
  }

  const stats = analytics
    ? [
        {
          label: "Total Tasks",
          value: formatCount(analytics.totalTasks),
          hint: "Posted in this period",
          iconBg: "bg-sky-100",
          iconText: "text-sky-600",
          icon: <ClipboardIcon />,
        },
        {
          label: "Total Revenue",
          value: formatMoney(analytics.mytotalRevenue),
          hint: `Across ${formatCount(analytics.paidBookings)} paid ${
            analytics.paidBookings === 1 ? "booking" : "bookings"
          }`,
          iconBg: "bg-emerald-100",
          iconText: "text-emerald-600",
          icon: <WalletIcon />,
        },
        {
          label: "Platform Fees",
          value: formatMoney(analytics.platformFees),
          hint: "Advance collected on those bookings",
          iconBg: "bg-violet-100",
          iconText: "text-violet-600",
          icon: <PercentIcon />,
        },
        {
          label: "New Users",
          value: formatCount(analytics.newUsers),
          hint: "Signed up in this period",
          iconBg: "bg-amber-100",
          iconText: "text-amber-600",
          icon: <UserPlusIcon />,
        },
      ]
    : [];

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="Analytics" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Analytics</h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {analytics
                ? `Live platform figures for ${formatDate(analytics.from)} - ${formatDate(analytics.to)}.`
                : "Live platform figures for the selected period."}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || rangeInvalid}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={changeRange(setFrom)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">To</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={changeRange(setTo)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <p className="text-sm text-slate-500">
            Drives the figures below and any report that covers a period.
          </p>
        </div>

        {rangeInvalid && (
          <p className="mt-3 text-sm font-medium text-red-600">
            The start date must not be after the end date.
          </p>
        )}

        {analyticsError && !rangeInvalid && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Could not load the figures for this period.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {!analytics && refreshing && (
          <p className="mt-6 text-sm text-slate-500">Loading figures...</p>
        )}

        {analytics && (
          <>
            <div
              className={`mt-6 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
                refreshing ? "opacity-60" : ""
              }`}
            >
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
                  <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
                </article>
              ))}
            </div>

            <div
              className={`mt-6 grid gap-4 transition-opacity lg:grid-cols-2 ${
                refreshing ? "opacity-60" : ""
              }`}
            >
              <BreakdownCard
                title="Top Service Categories"
                caption="The categories customers posted most in this period."
                rows={analytics.topCategories ?? []}
                emptyLabel="No tasks were posted in this period."
                barClass="bg-emerald-500"
              />
              <BreakdownCard
                title="Top Locations"
                caption="The cities with the most task activity in this period."
                rows={analytics.topLocations ?? []}
                emptyLabel="No tasks were posted in this period."
                barClass="bg-sky-500"
              />
            </div>
          </>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Reports</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Generate data-driven reports as PDF or Excel.
          </p>
        </div>

        {loadingReports && <p className="mt-6 text-sm text-slate-600">Loading reports…</p>}

        {!loadingReports && reports.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-600">No reports are available.</p>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <article
              key={report.slug}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h3 className="text-base font-semibold text-slate-900">{report.title}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-600">
                {report.dateRanged
                  ? "Covers the selected date range."
                  : "A snapshot of current totals, not a date range."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null || rangeInvalid}
                  onClick={() => handleDownload(report, "pdf")}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy === `${report.slug}:pdf` ? "Generating…" : "PDF"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null || rangeInvalid}
                  onClick={() => handleDownload(report, "xlsx")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  {busy === `${report.slug}:xlsx` ? "Generating…" : "Excel"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
