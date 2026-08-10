import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import AdminSearchInput from "../../components/Admin/AdminSearchInput";
import AdminInquiryDetailModal from "../../components/Admin/AdminInquiryDetailModal";
import { listInquiries, reopenInquiry, resolveInquiry } from "../../api/adminApi";
import useConfirm from "../../hooks/useConfirm";

// The server takes a boolean, so each pill carries the params it filters with rather than the
// page translating a label at the call site.
const FILTERS = [
  { label: "All", params: {} },
  { label: "New", params: { handled: false } },
  { label: "Resolved", params: { handled: true } },
];

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [confirm, confirmDialog] = useConfirm();

  // Switching filters refetches, so the spinner is raised here rather than inside the effect;
  // re-picking the current filter would otherwise leave it up with nothing to clear it.
  const handleFilterChange = (next) => {
    if (next === filter) return;
    setLoading(true);
    setFilter(next);
  };

  useEffect(() => {
    let cancelled = false;

    const params = FILTERS.find((f) => f.label === filter)?.params ?? {};
    listInquiries(params)
      .then((rows) => {
        if (!cancelled) setInquiries(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load inquiries.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Search stays in the browser: the filtered rows are all here already, so matching locally
  // keeps results instant and avoids a request on every keystroke.
  const query = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return inquiries;
    return inquiries.filter((inquiry) =>
      [inquiry.name, inquiry.email, inquiry.subject, inquiry.message].some((field) =>
        field?.toLowerCase().includes(query),
      ),
    );
  }, [inquiries, query]);

  // Derived rather than stored, so resolving a row that then leaves the current filter closes
  // the modal instead of leaving it showing a record the list no longer holds.
  const detailInquiry = detailId == null ? null : visible.find((i) => i.id === detailId);

  const handleToggleHandled = async (inquiry) => {
    const ok = await confirm(
      inquiry.handled
        ? {
            title: "Reopen this inquiry?",
            body: `${inquiry.name}'s message goes back into the New queue for someone to answer.`,
            confirmLabel: "Reopen inquiry",
            cancelLabel: "Leave it",
            tone: "primary",
          }
        : {
            title: "Mark this inquiry resolved?",
            body: `${inquiry.name}'s message moves out of the New queue. Only do this once they've actually been answered.`,
            confirmLabel: "Mark resolved",
            cancelLabel: "Leave it",
            tone: "primary",
          },
    );
    if (!ok) return;

    setActioningId(inquiry.id);
    try {
      const updated = inquiry.handled
        ? await reopenInquiry(inquiry.id)
        : await resolveInquiry(inquiry.id);

      // Under "New" or "Resolved" the row has just left the filter it was fetched under, so it
      // is dropped rather than replaced - otherwise the list would contradict its own pill.
      const stillMatches = filter === "All";
      setInquiries((prev) =>
        stillMatches
          ? prev.map((i) => (i.id === inquiry.id ? updated : i))
          : prev.filter((i) => i.id !== inquiry.id),
      );
      toast.success(updated.handled ? "Inquiry marked resolved." : "Inquiry reopened.");
    } catch (err) {
      toast.error(err.response?.data?.message || "That action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="Inquiries" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Inquiries</h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Messages sent through the Contact Us form.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or subject"
              className="sm:w-72"
            />

            <div className="flex flex-wrap gap-2">
              {FILTERS.map(({ label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleFilterChange(label)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    filter === label
                      ? "bg-white text-brand ring-2 ring-brand/30 shadow-sm"
                      : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:text-slate-900",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Wide enough that the two action buttons sit on one line instead of the
                Actions column squeezing them into a stack; the wrapper scrolls below that. */}
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Received</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((inquiry) => (
                  <tr key={inquiry.id} className={inquiry.handled ? "" : "bg-amber-50/40"}>
                    <td className="px-5 py-3 text-slate-500">{formatDate(inquiry.createdAt)}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{inquiry.name}</td>
                    <td className="px-5 py-3 text-slate-600">{inquiry.email}</td>
                    <td className="px-5 py-3 text-slate-600">{inquiry.subject}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inquiry.handled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {inquiry.handled ? "Resolved" : "New"}
                      </span>
                    </td>
                    <td className="w-px whitespace-nowrap px-5 py-3">
                      <div className="flex flex-nowrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailId(inquiry.id)}
                          className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={actioningId === inquiry.id}
                          onClick={() => handleToggleHandled(inquiry)}
                          className={[
                            "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                            inquiry.handled
                              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              : "bg-emerald-600 text-white hover:bg-emerald-700",
                          ].join(" ")}
                        >
                          {inquiry.handled ? "Reopen" : "Mark Resolved"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      {query
                        ? `No inquiries match "${search.trim()}".`
                        : "No inquiries match this filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {detailInquiry && (
        <AdminInquiryDetailModal
          inquiry={detailInquiry}
          busy={actioningId === detailInquiry.id}
          onToggleHandled={handleToggleHandled}
          onClose={() => setDetailId(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
}
