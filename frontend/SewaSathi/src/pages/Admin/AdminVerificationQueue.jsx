import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import AdminSearchInput from "../../components/Admin/AdminSearchInput";
import { DetailField, DocumentLink } from "../../components/Admin/detailUi";
import { approveWorker, listPendingWorkers, rejectWorker } from "../../api/adminApi";

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
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState(null);
  // A set rather than a single id so several cards can be opened and compared side by side.
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  useEffect(() => {
    listPendingWorkers()
      .then(setWorkers)
      .catch(() => toast.error("Could not load the verification queue."))
      .finally(() => setLoading(false));
  }, []);

  // The whole queue is fetched once, so searching filters the cards already in hand.
  // Skills and city are searchable too: finding "the electricians in Lalitpur" is as common
  // a reason to search this page as looking up one applicant by name.
  const query = search.trim().toLowerCase();
  const visibleWorkers = useMemo(() => {
    if (!query) return workers;
    return workers.filter((worker) =>
      [worker.fullName, worker.email, worker.phone, worker.location, worker.skills].some(
        (field) => field?.toLowerCase().includes(query),
      ),
    );
  }, [workers, query]);

  const toggleDetails = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      setExpandedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Verification Queue</h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Review worker signups and approve or reject their accounts.
            </p>
          </div>

          {/* Nothing to search when the queue is empty, so the box stays out of the way. */}
          {!loading && workers.length > 0 && (
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, city, or skill"
              className="sm:w-72"
            />
          )}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : visibleWorkers.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-600">
              {query ? `No pending workers match "${search.trim()}".` : "No pending verifications."}
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {visibleWorkers.map((worker) => (
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
                    <p className="mt-1 text-xs text-slate-400">
                      Verification submitted {formatDate(worker.verificationSubmittedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDetails(worker.id)}
                      aria-expanded={expandedIds.has(worker.id)}
                      aria-controls={`worker-details-${worker.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {expandedIds.has(worker.id) ? "Hide Details" : "View Details"}
                    </button>
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

                {expandedIds.has(worker.id) && (
                  <div
                    id={`worker-details-${worker.id}`}
                    className="mt-4 border-t border-slate-200 pt-4"
                  >
                    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      <DetailField label="Email" value={worker.email} />
                      <DetailField label="Phone" value={worker.phone} />
                      <DetailField label="Address" value={worker.address} />
                      <DetailField label="City" value={worker.location} />
                      <DetailField label="Experience" value={worker.yearsOfExperience} />
                      <DetailField
                        label="Hourly rate"
                        value={worker.hourlyRate != null ? `NPR ${worker.hourlyRate}/hr` : null}
                      />
                      <DetailField label="Account created" value={formatDate(worker.createdAt)} />
                    </dl>

                    {worker.skills && (
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Skills
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {worker.skills
                            .split(",")
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
                        </div>
                      </div>
                    )}

                    {worker.bio && (
                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Bio
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">{worker.bio}</p>
                      </div>
                    )}

                    {/*
                      These are identity documents behind an authenticated endpoint, so they
                      are fetched with the admin's token rather than linked to directly.
                    */}
                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Documents
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        <DocumentLink url={worker.policeClearanceUrl} name="Police Clearance Report" />
                        <DocumentLink url={worker.citizenshipDocUrl} name="Citizenship / ID" />
                        <DocumentLink url={worker.profilePhotoUrl} name="Profile Photo" />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
