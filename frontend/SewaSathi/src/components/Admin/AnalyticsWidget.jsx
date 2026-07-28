import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAnalytics } from "../../api/adminApi";
import {
  formatCount,
  formatMoney,
  formatTime,
  isoDaysAgo,
  todayIso,
} from "./analyticsFormat";

/** Windows the widget offers. Kept short - the full page is there for arbitrary ranges. */
const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/** How often the figures re-read themselves while the dashboard is open. */
const REFRESH_MS = 60_000;

/** Entries per top list. Three keeps the widget compact; the full page shows five. */
const TOP_N = 3;

function MiniList({ title, rows, emptyLabel, barClass }) {
  const busiest = rows.reduce((max, row) => Math.max(max, row.taskCount), 0);

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-800">
                  {row.label}
                </span>
                <span className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatCount(row.taskCount)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  // Widths come from live counts, so they cannot be Tailwind classes.
                  style={{ width: `${busiest ? (row.taskCount / busiest) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * A live summary of the platform's activity for the admin dashboard: the same figures the
 * Analytics page shows, over a short selectable window, re-read on a timer so a dashboard
 * left open does not quietly go stale.
 */
export default function AnalyticsWidget() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  // Bumped by the refresh timer and by Retry, so the same window can be re-read.
  const [reloadToken, setReloadToken] = useState(0);

  function selectPeriod(nextDays) {
    setDays(nextDays);
    // Flagged here rather than in the fetch effect, which must not set state synchronously.
    setLoading(true);
  }

  useEffect(() => {
    let current = true;
    // `days - 1`, so "7 days" is today plus the six before it rather than eight days.
    const from = isoDaysAgo(days - 1);

    getAnalytics({ from, to: todayIso() })
      .then((data) => {
        if (!current) return;
        setAnalytics(data);
        setUpdatedAt(new Date());
        setError(false);
      })
      .catch(() => {
        if (current) setError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [days, reloadToken]);

  // The timer only nudges the token; the fetch itself stays in the effect above, so a
  // refresh and a period change cannot race into two competing requests.
  useEffect(() => {
    const timer = setInterval(() => setReloadToken((token) => token + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const tiles = analytics
    ? [
        { label: "Tasks", value: formatCount(analytics.totalTasks) },
        { label: "Revenue", value: formatMoney(analytics.totalRevenue) },
        { label: "Platform fees", value: formatMoney(analytics.platformFees) },
        { label: "New users", value: formatCount(analytics.newUsers) },
      ]
    : [];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Platform Analytics</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {updatedAt
              ? `Live figures, updated ${formatTime(updatedAt)}`
              : "Live figures for the selected period."}
          </p>
        </div>

        <div className="flex rounded-lg border border-slate-200 p-0.5" role="group">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              onClick={() => selectPeriod(period.days)}
              aria-pressed={days === period.days}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                days === period.days
                  ? "bg-emerald-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            Could not load the figures.
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {!analytics && loading && (
        <p className="mt-6 text-sm text-slate-500">Loading figures...</p>
      )}

      {analytics && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-600">{tile.label}</dt>
                <dd className="mt-1 truncate text-lg font-extrabold tracking-tight text-slate-900">
                  {tile.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <MiniList
              title="Top service categories"
              rows={(analytics.topCategories ?? []).slice(0, TOP_N)}
              emptyLabel="No tasks in this period."
              barClass="bg-emerald-500"
            />
            <MiniList
              title="Top locations"
              rows={(analytics.topLocations ?? []).slice(0, TOP_N)}
              emptyLabel="No tasks in this period."
              barClass="bg-sky-500"
            />
          </div>

          <Link
            to="/admin/analytics"
            className="mt-5 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View full analytics &rarr;
          </Link>
        </div>
      )}
    </section>
  );
}
