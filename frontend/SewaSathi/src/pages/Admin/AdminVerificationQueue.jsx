import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import { approveWorker, listPendingWorkers, rejectWorker } from "../../api/adminApi";
import { downloadFile } from "../../api/fileApi";

/**
 * Opens a worker's uploaded document. Identity documents are no longer publicly readable,
 * so the bytes come back through the authenticated /api/files endpoint and are handed to
 * the browser as a download rather than a plain link.
 */
function DocumentLink({ url, label }) {
  const [busy, setBusy] = useState(false);

  if (!url) return null;

  const open = async () => {
    setBusy(true);
    try {
      await downloadFile(url, label);
    } catch {
      toast.error("Could not open that document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="text-xs font-semibold text-brand underline underline-offset-2 hover:text-brand-dark disabled:opacity-60"
    >
      {busy ? "Opening…" : label}
    </button>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminVerificationQueue() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    listPendingWorkers()
      .then(setWorkers)
      .catch(() => toast.error("Could not load the verification queue."))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id, action) => {
    setActioningId(id);
    try {
      if (action === "approve") {
        await approveWorker(id);
        toast.success("Worker approved.");
      } else {
        await rejectWorker(id);
        toast.success("Worker rejected.");
      }
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    } catch {
      toast.error("That action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="Verification Queue" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Verification Queue</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Review worker signups and approve or reject their accounts.
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : workers.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-600">No pending verifications.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {workers.map((worker) => (
              <li
                key={worker.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{worker.fullName}</h3>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {worker.email} · {worker.phone}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Verification submitted {formatDate(worker.verificationSubmittedAt)}
                    </p>
                    {worker.address && (
                      <p className="mt-1 text-sm text-slate-500">{worker.address}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {worker.skills
                        ?.split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                      {worker.location && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {worker.location}
                        </span>
                      )}
                      {worker.yearsOfExperience && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {worker.yearsOfExperience}
                        </span>
                      )}
                      {worker.hourlyRate != null && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          NPR {worker.hourlyRate}/hr
                        </span>
                      )}
                    </div>

                    {worker.bio && (
                      <p className="mt-3 text-sm text-slate-600">{worker.bio}</p>
                    )}

                    {/*
                      These are identity documents behind an authenticated endpoint, so they
                      are fetched with the admin's token rather than linked to directly.
                    */}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <DocumentLink url={worker.policeClearanceUrl} label="View Police Clearance Report" />
                      <DocumentLink url={worker.citizenshipDocUrl} label="View Citizenship / ID" />
                      <DocumentLink url={worker.profilePhotoUrl} label="View Profile Photo" />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={actioningId === worker.id}
                      onClick={() => handleAction(worker.id, "approve")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actioningId === worker.id}
                      onClick={() => handleAction(worker.id, "reject")}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
