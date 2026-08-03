import SideNav from "../ui/SideNav";
import { GridIcon, MailIcon, ShieldIcon, UsersIcon } from "../ui/icons";

/**
 * Admin side rail. Same shell as the customer and worker rails, with the
 * neutral slate accent from AVATAR_BY_ROLE so the three panels read as one
 * product without the admin console borrowing the customer's brand blue.
 */

function AnalyticsIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Overview", to: "/admin", end: true, icon: <GridIcon /> },
  { label: "Analytics", to: "/admin/analytics", icon: <AnalyticsIcon /> },
  { label: "Verification Queue", to: "/admin/verifications", icon: <ShieldIcon /> },
  { label: "User Management", to: "/admin/users", icon: <UsersIcon /> },
  { label: "Inquiries", to: "/admin/inquiries", icon: <MailIcon /> },
];

function AdminSidebar({ mobileOpen, onCloseMobile }) {
  return (
    <SideNav
      items={NAV_ITEMS}
      subtitle="Admin Dashboard"
      accent="slate"
      ariaLabel="Admin"
      brandTo="/admin"
      mobileOpen={mobileOpen}
      onCloseMobile={onCloseMobile}
    />
  );
}

export default AdminSidebar;
