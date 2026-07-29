import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "../UserMenu";
import { MenuIcon } from "../ui/icons";

/**
 * Worker header. Height comes from `--dash-header-h` at sm and up, matching the
 * customer and admin headers — the worker Browse Tasks filter bar offsets its
 * sticky position by that same token.
 */
function WorkerHeader({ title = "Worker Dashboard" }) {
  const { customer } = useAuth();
  const outletContext = useOutletContext();
  const openMobileMenu = outletContext?.openMobileMenu;

  const displayId = customer?.email || customer?.name || "Worker";

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
          <UserMenu initials={customer?.initials || "WK"} displayName={displayId} avatarClassName="bg-emerald-600" />
        </div>
      </div>
    </header>
  );
}

export default WorkerHeader;
