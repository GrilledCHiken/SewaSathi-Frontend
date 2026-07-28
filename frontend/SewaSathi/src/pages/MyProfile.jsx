import AdminHeader from "../components/Admin/AdminHeader";
import DashboardHeader from "../components/User/DashboardHeader";
import AccountSettings from "../components/profile/AccountSettings";
import { useAuth } from "../context/AuthContext";

/**
 * "My Profile" for customers and admins, whose account has nothing on it beyond the shared
 * details. Workers get their own screen because they also have professional fields to edit.
 *
 * The header is picked here rather than in the layout because every page in this app renders
 * its own — the dashboard layouts are a sidebar and a bare Outlet.
 */
export default function MyProfile() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      {isAdmin ? <AdminHeader title="My Profile" /> : <DashboardHeader searchPlaceholder="Search workers..." />}

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Profile</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Update your photo, your details, and your password.
          </p>

          <div className="mt-6">
            <AccountSettings accent="brand" />
          </div>
        </div>
      </main>
    </div>
  );
}
