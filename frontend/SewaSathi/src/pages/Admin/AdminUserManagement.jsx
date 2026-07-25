import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AdminHeader from "../../components/Admin/AdminHeader";
import { listUsers, suspendUser, unsuspendUser } from "../../api/adminApi";

const ROLE_FILTERS = ["All", "CUSTOMER", "WORKER", "ADMIN"];

const STATUS_STYLES = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
};

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
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => toast.error("Could not load users."))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(
    () => (roleFilter === "All" ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter],
  );

  const handleToggleSuspend = async (user) => {
    if (!user.suspended) {
      const confirmed = window.confirm(
        `Suspend ${user.fullName}? They won't be able to log in until unsuspended.`,
      );
      if (!confirmed) return;
    }

    setActioningId(user.id);
    try {
      const updated = user.suspended ? await unsuspendUser(user.id) : await suspendUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(updated.suspended ? `${user.fullName} suspended.` : `${user.fullName} unsuspended.`);
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

          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
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

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{user.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{user.email}</td>
                    <td className="px-5 py-3 text-slate-600">{user.role}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[user.status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          user.suspended
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3">
                      {user.role === "ADMIN" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <button
                          type="button"
                          disabled={actioningId === user.id}
                          onClick={() => handleToggleSuspend(user)}
                          className={[
                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                            user.suspended
                              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              : "bg-red-600 text-white hover:bg-red-700",
                          ].join(" ")}
                        >
                          {user.suspended ? "Unsuspend" : "Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      No users match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
