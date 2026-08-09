import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import UserMenu from "../UserMenu";
import BackLink from "../ui/BackLink";
import { MenuIcon } from "../ui/icons";

/**
 * Sticky header for the customer dashboard.
 *
 * Three things changed here beyond the skin:
 *
 * 1. `title` is a prop. It used to be hardcoded to "Customer Dashboard", so
 *    every one of the ten routes under /dashboard claimed the same page name.
 *    The admin header already did this properly; this now matches it. The
 *    default keeps any not-yet-migrated caller rendering exactly as before.
 *
 * 2. The header takes its own height from `--dash-header-h` at sm and up,
 *    rather than the token being a hand-computed guess at what the header
 *    happens to measure. TaskFilterBar offsets its sticky position by that same
 *    token, so the old arrangement broke silently whenever this file's padding
 *    changed. Now the token is the single source of truth.
 *
 * 3. The worker search box is gone. It submitted to Browse Workers, which has
 *    its own search that is the one that actually filters the list — so the
 *    header box was a second, weaker entry point to the same place. Without it
 *    this header is a single row at every breakpoint, and structurally the same
 *    as the worker and admin headers.
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
