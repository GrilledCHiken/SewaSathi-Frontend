import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import UserMenu from "../UserMenu";
import BackLink from "../ui/BackLink";
import { MenuIcon } from "../ui/icons";

/**
 * Sticky header for the customer dashboard, structurally the same as the worker and admin
 * headers.
 *
 * The header takes its own height from `--dash-header-h` at sm and up. TaskFilterBar offsets
 * its sticky position by that same token, so the token — not this file's padding — is the
 * single source of truth.
 */
function DashboardHeader({
  title = "Customer Dashboard",
  backTo = "/dashboard",
  showBack = true,
}) {
  const { customer } = useAuth();
  const outletContext = useOutletContext();
  const openMobileMenu = outletContext?.openMobileMenu;

  const displayName = customer?.name || "Customer";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 px-4 py-3 shadow-inset-line backdrop-blur-md sm:h-[var(--dash-header-h)] sm:px-6 sm:py-0 lg:px-8">
      <div className="flex h-full items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-field p-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink focus-ring lg:hidden"
            aria-label="Open menu"
            onClick={openMobileMenu}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          {showBack && <BackLink iconOnly to={backTo} />}
          <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center justify-end gap-2 sm:shrink-0 sm:gap-3">
          {/* Was a decorative bell with a hardcoded red dot; now backed by the real feed. */}
          <NotificationBell />

          <UserMenu
            initials={customer?.initials || "CU"}
            displayName={displayName}
            avatarClassName="bg-brand"
          />
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
