import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import AdminSearchInput from "../../components/Admin/AdminSearchInput";
import RejectWorkerDialog from "../../components/Admin/RejectWorkerDialog";
import { DetailField, DocumentLink } from "../../components/detailUi";
import SegmentedControl from "../../components/ui/SegmentedControl";
import {
  approveClearanceRenewal,
  approveWorker,
  listClearanceRenewals,
  listPendingWorkers,
  rejectClearanceRenewal,
  rejectWorker,
} from "../../api/adminApi";
import { formatDate } from "../../utils/dates";
import useConfirm from "../../hooks/useConfirm";

const TABS = [
  { value: "applications", label: "New applications" },
  { value: "renewals", label: "Clearance renewals" },
];

/** Both queues hand their handlers an id; a confirmation reads better with the person's name. */
const nameOf = (rows, id) =>
  rows.find((worker) => worker.id === id)?.fullName || "this worker";

/**
 * Two queues, because there are two reasons a worker's documents land on an admin's desk.
 *
 * "New applications" are PENDING accounts waiting to be let in at all. "Clearance renewals" are
 * approved workers replacing a police clearance report, which only counts for six months — they
 * keep working throughout, so approving one swaps the document on file rather than the account's
 * standing. Same reviewing motion, very different consequences, hence the split.
 */
export default function AdminVerificationQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "renewals" ? "renewals" : "applications";

  const [workers, setWorkers] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState(null);
  // The applicant whose rejection reason is being typed, or null when the dialog is closed.
  const [rejecting, setRejecting] = useState(null);
  // A set rather than a single id so several cards can be opened and compared side by side.
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    Promise.all([listPendingWorkers(), listClearanceRenewals()])
      .then(([pending, pendingRenewals]) => {
        setWorkers(pending);
        setRenewals(pendingRenewals);
      })
      .catch(() => toast.error("Could not load the verification queue."))
      .finally(() => setLoading(false));
  }, []);

  const rows = tab === "renewals" ? renewals : workers;

  // The whole queue is fetched once, so searching filters the cards already in hand.
  // Skills and city are searchable too: finding "the electricians in Lalitpur" is as common
  // a reason to search this page as looking up one applicant by name.
  const query = search.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    if (!query) return rows;
    return rows.filter((worker) =>
      [worker.fullName, worker.email, worker.phone, worker.location, worker.skills].some(
        (field) => field?.toLowerCase().includes(query),
      ),
    );
  }, [rows, query]);

  const selectTab = (next) => {
    setSearchParams(next === "renewals" ? { tab: "renewals" } : {}, { replace: true });
    setExpandedIds(new Set());
  };

  const toggleDetails = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const forget = (id) => {
    setExpandedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Either decision emails the worker, so the toast says so — the send is best-effort on the
  // server and never blocks the decision, which is why a failed email is not surfaced here.
  const handleApprove = async (id) => {
    const ok = await confirm({
      title: `Approve ${nameOf(workers, id)}?`,
      body: "They can start taking jobs immediately and are emailed to say they're in. Check their documents before you do this.",
      confirmLabel: "Approve worker",
      cancelLabel: "Not yet",
      tone: "emerald",
    });
    if (!ok) return;

    setActioningId(id);
    try {
      await approveWorker(id);
      toast.success("Worker approved. They have been emailed.");
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      forget(id);
    } catch {
      toast.error("That action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (reason) => {
    const id = rejecting.id;
    setActioningId(id);
    try {
      await rejectWorker(id, reason);
      toast.success("Worker rejected. They have been emailed the reason.");
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      forget(id);
      setRejecting(null);
    } catch {
      // The dialog stays open with the text intact, so the reason does not have to be retyped.
      toast.error("That action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  /* Unlike an application, neither renewal decision collects a reason, so this dialog is the
     only thing standing between a mis-click and a swapped or discarded clearance report. */
  const handleRenewalAction = async (id, action) => {
    const name = nameOf(renewals, id);
    const ok = await confirm(
      action === "approve"
        ? {
            title: `Accept ${name}'s new clearance report?`,
            body: "It replaces the report on file and counts as valid for the next six months.",
            confirmLabel: "Accept report",
            cancelLabel: "Not yet",
            tone: "emerald",
          }
        : {
            title: `Reject ${name}'s renewal?`,
            body: "The new report is discarded and their previous one stands, so it will expire on its original date. They keep working in the meantime.",
            confirmLabel: "Reject renewal",
            cancelLabel: "Go back",
            tone: "danger",
          },
    );
    if (!ok) return;

    setActioningId(id);
    try {
      if (action === "approve") {
        await approveClearanceRenewal(id);
        toast.success("New report accepted. It is valid for the next six months.");
      } else {
        await rejectClearanceRenewal(id);
        toast.success("Renewal rejected. The previous report still stands.");
      }
      setRenewals((prev) => prev.filter((w) => w.id !== id));
      forget(id);
    } catch {
      toast.error("That action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  const isRenewals = tab === "renewals";

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="Verification Queue" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Verification Queue</h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {isRenewals
                ? "Approved workers replacing their police clearance report, which expires every six months."
                : "Review worker signups and approve or reject their accounts."}
            </p>
          </div>

          {/* Nothing to search when the queue is empty, so the box stays out of the way. */}
          {!loading && rows.length > 0 && (
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, city, or skill"
              className="sm:w-72"
            />
          )}
        </div>

        <SegmentedControl
          className="mt-4"
          options={TABS}
          value={tab}
          onChange={selectTab}
          counts={{ applications: workers.length, renewals: renewals.length }}
          ariaLabel="Queue"
        />

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : visibleRows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-600">
              {query
                ? `No workers match "${search.trim()}".`
                : isRenewals
                  ? "No clearance renewals waiting."
                  : "No pending verifications."}
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {visibleRows.map((worker) => (
              <li
                key={worker.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{worker.fullName}</h3>
                      <span
                        className={
                          isRenewals
                            ? "rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700"
                            : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
                        }
                      >
                        {isRenewals ? "Renewal" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {isRenewals
                        ? `New report submitted ${formatDate(worker.pendingPoliceClearanceUploadedAt)}`
                        : `Verification submitted ${formatDate(worker.verificationSubmittedAt)}`}
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
                      onClick={() =>
                        isRenewals
                          ? handleRenewalAction(worker.id, "approve")
                          : handleApprove(worker.id)
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actioningId === worker.id}
                      onClick={() =>
                        isRenewals ? handleRenewalAction(worker.id, "reject") : setRejecting(worker)
                      }
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
                    {isRenewals ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            On file now
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Uploaded {formatDate(worker.policeClearanceUploadedAt) || "—"} · expires{" "}
                            {formatDate(worker.policeClearanceExpiresAt) || "—"}
                          </p>
                          <div className="mt-1.5">
                            <DocumentLink
                              url={worker.policeClearanceUrl}
                              name="current report"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-sky-500">
                            Submitted for review
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Uploaded {formatDate(worker.pendingPoliceClearanceUploadedAt)}
                          </p>
                          <div className="mt-1.5">
                            <DocumentLink
                              url={worker.pendingPoliceClearanceUrl}
                              name="new report"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <RejectWorkerDialog
        worker={rejecting}
        submitting={actioningId === rejecting?.id}
        onCancel={() => setRejecting(null)}
        onConfirm={handleReject}
      />

      {confirmDialog}
    </div>
  );
}
