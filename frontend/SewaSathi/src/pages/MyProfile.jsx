import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminHeader from "../components/Admin/AdminHeader";
import DashboardHeader from "../components/User/DashboardHeader";
import AccountSettings from "../components/profile/AccountSettings";
import ProfileSummaryCard from "../components/profile/ProfileSummaryCard";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import StatTile from "../components/ui/StatTile";
import {
  CardIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldIcon,
} from "../components/ui/icons";
import { getDashboardSummary } from "../api/dashboardApi";
import { listMyPayments } from "../api/paymentApi";
import { formatCount, formatRupees } from "../utils/formatStats";
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
  const isCustomer = user?.role === "CUSTOMER";

  const [activity, setActivity] = useState(null);

  useEffect(() => {
    // /dashboard/** and /payments/** are customer-only in SecurityConfig, so the admin sharing
    // this page must not fire them — they would come back 403 and toast an error at someone
    // who did nothing wrong.
    if (!isCustomer) return;

    let cancelled = false;
    Promise.all([getDashboardSummary(), listMyPayments()])
      .then(([summary, payments]) => {
        if (cancelled) return;
        const paid = payments.filter((p) => p.status === "COMPLETED");
        setActivity({
          activeTasks: summary.activeTasks,
          completedTasks: summary.completedTasks,
          totalPaid: paid.reduce((sum, p) => sum + Number(p.amount || 0), 0),
          paymentCount: paid.length,
        });
      })
      // Silent: the stats are a summary of pages the user can open directly, so failing to
      // load them is not worth interrupting a profile edit over.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isCustomer]);

  return (
    <PageShell
      width="md"
      header={
        isAdmin ? (
          <AdminHeader title="My Profile" />
        ) : (
          <DashboardHeader title="My Profile" />
        )
      }
    >
      <PageHeader
        title="My Profile"
        description="Your account details, your activity on SewaSathi, and your sign-in settings."
      />

      <div className="mt-6 space-y-4">
        <ProfileSummaryCard accent="brand" />

        {isCustomer && activity && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Active tasks"
              value={formatCount(activity.activeTasks)}
              icon={<ClockIcon className="h-5 w-5" />}
              tone="brand"
              to="/dashboard/tasks"
            />
            <StatTile
              label="Completed tasks"
              value={formatCount(activity.completedTasks)}
              icon={<CheckCircleIcon className="h-5 w-5" />}
              tone="success"
              to="/dashboard/tasks"
            />
            <StatTile
              label="Total paid"
              value={formatRupees(activity.totalPaid)}
              icon={<CardIcon className="h-5 w-5" />}
              tone="info"
              to="/dashboard/payments"
            />
            <StatTile
              label="Payments made"
              value={formatCount(activity.paymentCount)}
              icon={<ClipboardIcon className="h-5 w-5" />}
              tone="neutral"
              to="/dashboard/payments"
            />
          </div>
        )}

        <AccountSettings accent="brand" />

        {isCustomer && (
          <section className="rounded-card border border-line bg-surface p-5 shadow-e1 sm:p-6">
            <h2 className="text-base font-bold text-ink">Security</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Sign-in alerts and signing out of every device you have used.
            </p>
            <Link
              to="/dashboard/security"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-body transition hover:border-brand/40 hover:text-brand focus-ring"
            >
              <ShieldIcon className="h-4 w-4" />
              Account security
            </Link>
          </section>
        )}
      </div>
    </PageShell>
  );
}
