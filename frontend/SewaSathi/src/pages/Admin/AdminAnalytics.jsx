import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import { downloadReport, listReports } from "../../api/adminApi";

/** ISO date string for an input[type=date], n years before today. */
function isoYearsAgo(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAnalytics() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  // Default to the last full year so a fresh install still has something in range.
  const [from, setFrom] = useState(isoYearsAgo(1));
  const [to, setTo] = useState(todayIso());
  // Keyed by `${slug}:${format}` so only the button actually clicked shows progress.
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => toast.error("Could not load the report list."))
      .finally(() => setLoading(false));
  }, []);

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

  const rangeInvalid = Boolean(from && to && from > to);

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="Analytics" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Reports</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Generate data-driven reports as PDF or Excel.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">To</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <p className="text-sm text-slate-500">
            Applies to reports that cover a period.
          </p>
        </div>

        {rangeInvalid && (
          <p className="mt-3 text-sm font-medium text-red-600">
            The start date must not be after the end date.
          </p>
        )}

        {loading && <p className="mt-6 text-sm text-slate-600">Loading reports…</p>}

        {!loading && reports.length === 0 && (
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
