import AdminHeader from "../components/Admin/AdminHeader";
import DashboardHeader from "../components/User/DashboardHeader";
import AccountSettings from "../components/profile/AccountSettings";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import { useAuth } from "../context/AuthContext";

/**
 * "My Profile" for customers and admins, whose account has nothing on it beyond the shared
 * details. Workers get their own screen because they also have professional fields to edit.
 *
 * The header is picked here rather than in the layout because every page in this app renders
 * its own — the dashboard layouts are a sidebar and a bare Outlet. That is also why PageShell
 * takes the header as a slot: this switch has to keep working.
 */
export default function MyProfile() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <PageShell
      width="sm"
      header={
        isAdmin ? (
          <AdminHeader title="My Profile" />
        ) : (
          <DashboardHeader title="My Profile" searchPlaceholder="Search workers..." />
        )
      }
    >
      <PageHeader
        title="My Profile"
        description="Update your photo, your details, and your password."
      />

      <div className="mt-6">
        <AccountSettings accent="brand" />
      </div>
    </PageShell>
  );
}
