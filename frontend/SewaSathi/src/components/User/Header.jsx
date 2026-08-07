import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "../UserMenu";
import Brandmark from "../ui/Brandmark";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Safety", href: "/safety" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const DASHBOARD_BY_ROLE = {
  CUSTOMER: "/dashboard",
  WORKER: "/worker",
  ADMIN: "/admin",
};

const AVATAR_BY_ROLE = {
  CUSTOMER: "bg-brand",
  WORKER: "bg-emerald-600",
  ADMIN: "bg-slate-900",
};

/** The app-wide keyboard-focus treatment; see the `focus-ring` utility in index.css. */
const FOCUS_RING = "focus-ring";

function navLinkClass({ isActive }) {
  return `whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9375rem] font-medium transition xl:px-3 ${FOCUS_RING} ${
    isActive
      ? "bg-brand/10 text-brand"
      : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
  }`;
}

function mobileNavLinkClass({ isActive }) {
  return `block rounded-lg px-3 py-2.5 text-base font-medium transition ${FOCUS_RING} ${
    isActive
      ? "bg-brand/10 text-brand"
      : "text-ink-body hover:bg-surface-muted hover:text-ink"
  }`;
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // Navigating away should always dismiss the panel. Adjusting during render
  // rather than in an effect avoids a cascading re-render.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function handleKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const dashboardPath = DASHBOARD_BY_ROLE[user?.role] ?? "/dashboard";
  const avatarClassName = AVATAR_BY_ROLE[user?.role] ?? "bg-brand";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left and right rails are both flex-1, so the nav between them lands
            on the true centre of the header regardless of their content. */}
        <div className="flex flex-1 justify-start">
          <Brandmark to="/" size="md" className="shrink-0" />
        </div>

        <nav
          className="hidden shrink-0 items-center gap-0.5 lg:flex xl:gap-1"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} to={link.href} end className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          {initializing ? (
            // Reserve the cluster's width so the signed-out buttons never flash
            // before the stored token resolves.
            <div className="h-10 w-24 lg:w-[168px]" aria-hidden="true" />
          ) : isAuthenticated ? (
            <>
              <Link
                to={dashboardPath}
                className={`hidden h-10 shrink-0 items-center justify-center rounded-full px-4 text-[0.9375rem] font-medium text-ink-body transition hover:bg-surface-sunken sm:inline-flex ${FOCUS_RING}`}
              >
                Dashboard
              </Link>
              <UserMenu
                initials={user?.initials || "CU"}
                displayName={user?.name || "Account"}
                avatarClassName={avatarClassName}
              />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`hidden h-10 shrink-0 items-center justify-center rounded-full px-4 text-[0.9375rem] font-medium text-ink-body transition hover:bg-surface-sunken lg:inline-flex ${FOCUS_RING}`}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-brand px-5 text-[0.9375rem] font-semibold text-white shadow-brand transition hover:bg-brand-dark hover:shadow-md hover:shadow-brand/30 active:scale-[0.98] focus-visible:ring-offset-2 ${FOCUS_RING}`}
              >
                Sign Up
              </Link>
            </>
          )}

          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-lg p-2 text-ink-muted transition hover:bg-surface-sunken lg:hidden ${FOCUS_RING}`}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="max-h-[calc(100svh-72px)] overflow-y-auto border-t border-line bg-white px-4 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <NavLink to={link.href} end className={mobileNavLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li className="mt-3 flex flex-col gap-2 border-t border-line-soft pt-3">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className={`inline-flex h-11 w-full items-center justify-center rounded-full border border-line text-[0.9375rem] font-medium text-ink-body transition hover:bg-surface-muted ${FOCUS_RING}`}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full border border-line text-[0.9375rem] font-medium text-ink-body transition hover:bg-surface-muted ${FOCUS_RING}`}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full bg-brand text-[0.9375rem] font-semibold text-white shadow-brand transition hover:bg-brand-dark active:scale-[0.99] ${FOCUS_RING}`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
