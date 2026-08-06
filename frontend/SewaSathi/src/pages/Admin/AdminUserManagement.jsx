import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import AdminSearchInput from "../../components/Admin/AdminSearchInput";
import AdminUserDetailModal from "../../components/Admin/AdminUserDetailModal";
import SuspendUserDialog from "../../components/Admin/SuspendUserDialog";
import { listUsers, suspendUser, unsuspendUser } from "../../api/adminApi";

// "All" deliberately means customers and workers: administrators are bootstrap accounts
// rather than sign-ups, so they sit behind their own filter instead of being mixed in.
const ROLE_FILTERS = ["All", "CUSTOMER", "WORKER", "ADMIN"];

const STATUS_STYLES = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
  // Deliberately louder than REJECTED: suspension is an admin lockout, not a verification
  // outcome, so the two should not read as interchangeable at a glance.
  SUSPENDED: "bg-red-600 text-white",
};

// Suspension overrides whatever the verification status says, so it takes the cell on its
// own; the detail modal still carries both facts separately.
function statusBadge(user) {
  if (user.suspended) return { label: "Suspended", className: STATUS_STYLES.SUSPENDED };
  return {
    label: user.status,
    className: STATUS_STYLES[user.status] || "bg-slate-100 text-slate-600",
  };
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [detailUserId, setDetailUserId] = useState(null);
  // The row awaiting a reason in the suspend/restore dialog, or null when it is closed.
  const [pendingUser, setPendingUser] = useState(null);

  // Switching filters refetches, so the spinner is raised here rather than inside the effect;
  // re-picking the current filter would otherwise leave it up with nothing to clear it.
  const handleFilterChange = (filter) => {
    if (filter === roleFilter) return;
    setLoading(true);
    setRoleFilter(filter);
  };

  // Filtering happens on the server rather than in the browser: administrators are absent
  // from the unfiltered listing by design, so there is no complete set to filter locally.
  useEffect(() => {
    let cancelled = false;

    listUsers(roleFilter === "All" ? {} : { role: roleFilter })
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roleFilter]);

  // Search stays in the browser: the role-filtered rows are all here already, so matching
  // locally keeps results instant and avoids a request on every keystroke.
  const query = search.trim().toLowerCase();
  const visibleUsers = useMemo(() => {
    if (!query) return users;
    return users.filter((user) =>
      [user.fullName, user.email, user.phone].some((field) =>
        field?.toLowerCase().includes(query),
      ),
    );
  }, [users, query]);

  // Both directions go through the dialog: suspending needs a reason to email, and restoring
  // offers an optional note on the same trip, so neither is a bare one-click action any more.
  const handleConfirmSuspension = async (message) => {
    const user = pendingUser;
    setActioningId(user.id);
    try {
      const updated = user.suspended
        ? await unsuspendUser(user.id, message)
        : await suspendUser(user.id, message);

      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setPendingUser(null);

      const done = updated.suspended ? "suspended" : "restored";
      // The account changed either way; the email is what may not have. Saying so matters -
      // the admin would otherwise assume the person had been told why.
      if (updated.emailSent === false) {
        toast.warning(`${user.fullName} ${done}, but the notification email could not be sent.`);
      } else {
        toast.success(`${user.fullName} ${done}. They have been emailed.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "That action failed. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <AdminHeader title="User Management" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">User Management</h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Directory of all registered accounts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or phone"
              className="sm:w-72"
            />

            <div className="flex flex-wrap gap-2">
              {ROLE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleFilterChange(filter)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    roleFilter === filter
                      ? "bg-white text-brand ring-2 ring-brand/30 shadow-sm"
                      : "bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:text-slate-900",
                  ].join(" ")}
                >
                  {filter === "All" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
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
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{user.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{user.email}</td>
                    <td className="px-5 py-3 text-slate-600">{user.role}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(user).className}`}
                      >
                        {statusBadge(user).label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="w-px whitespace-nowrap px-5 py-3">
                      {/* Administrator accounts are not actionable: the API hides their detail
                          and refuses to suspend them, so offering either button here would only
                          produce an error. */}
                      {user.role === "ADMIN" ? (
                        <span className="text-xs text-slate-400">&mdash;</span>
                      ) : (
                        <div className="flex flex-nowrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailUserId(user.id)}
                            className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            disabled={actioningId === user.id}
                            onClick={() => setPendingUser(user)}
                            className={[
                              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                              user.suspended
                                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                : "bg-red-600 text-white hover:bg-red-700",
                            ].join(" ")}
                          >
                            {user.suspended ? "Unsuspend" : "Suspend"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      {query
                        ? `No users match "${search.trim()}".`
                        : "No users match this filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {detailUserId && (
        <AdminUserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
      )}

      <SuspendUserDialog
        user={pendingUser}
        submitting={pendingUser != null && actioningId === pendingUser.id}
        onCancel={() => setPendingUser(null)}
        onConfirm={handleConfirmSuspension}
      />
    </div>
  );
}
