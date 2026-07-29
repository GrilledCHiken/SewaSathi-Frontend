import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import UserMenu from "../UserMenu";
import Button from "../ui/Button";
import { MenuIcon, PlusIcon, SearchIcon } from "../ui/icons";

/**
 * Sticky header for the customer dashboard.
 *
 * Two things changed here beyond the skin:
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
 * Mobile keeps the two-row stack and is therefore taller — which is fine,
 * because the sticky filter bar only engages at sm and up.
 */
function DashboardHeader({ title = "Customer Dashboard", searchPlaceholder = "Search..." }) {
  const { customer } = useAuth();
  const outletContext = useOutletContext();
  const openMobileMenu = outletContext?.openMobileMenu;
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const displayId = customer?.email || customer?.name || "Customer";

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/dashboard/workers?search=${encodeURIComponent(trimmed)}`);
  };

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

        <form
          onSubmit={handleSearch}
          className="relative flex-1 sm:mx-auto sm:max-w-md lg:max-w-lg"
        >
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-transparent bg-surface-sunken py-2.5 pl-11 pr-4 text-sm text-ink transition placeholder:text-ink-faint focus:border-brand/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20"
            aria-label="Search workers"
          />
        </form>

        <div className="flex items-center justify-end gap-2 sm:shrink-0 sm:gap-3">
          <Button
            as={Link}
            to="/dashboard/post-task"
            size="sm"
            className="hidden lg:inline-flex"
            iconLeft={<PlusIcon className="h-4 w-4" />}
          >
            Post a Task
          </Button>

          {/* Was a decorative bell with a hardcoded red dot; now backed by the real feed. */}
          <NotificationBell />

          <UserMenu
            initials={customer?.initials || "CU"}
            displayName={displayId}
            avatarClassName="bg-brand"
          />
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
