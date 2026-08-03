import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import UserMenu from "../UserMenu";
import { MenuIcon } from "../ui/icons";

/**
 * Admin header. Height comes from `--dash-header-h` at sm and up, matching the
 * customer and worker headers.
 */
function AdminHeader({ title = "Admin Dashboard" }) {
  const { user } = useAuth();
  const outletContext = useOutletContext();
  const openMobileMenu = outletContext?.openMobileMenu;

  const displayId = user?.email || user?.name || "Admin";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 px-4 py-3 shadow-inset-line backdrop-blur-md sm:h-[var(--dash-header-h)] sm:px-6 sm:py-0 lg:px-8">
      <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-field p-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink focus-ring lg:hidden"
            aria-label="Open menu"
            onClick={openMobileMenu}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
            {title}
          </h1>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:ml-auto">
          {/* The customer and worker headers have always carried the bell; the admin one now
              does too, because a contact-form inquiry has no other way to announce itself. */}
          <NotificationBell />
          <UserMenu initials={user?.initials || "AD"} displayName={displayId} avatarClassName="bg-brand" />
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
