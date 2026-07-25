import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "../UserMenu";

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

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

function LogoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function navLinkClass({ isActive }) {
  return `whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9375rem] font-medium transition xl:px-3 ${FOCUS_RING} ${
    isActive
      ? "bg-brand/10 text-brand"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

function mobileNavLinkClass({ isActive }) {
  return `block rounded-lg px-3 py-2.5 text-base font-medium transition ${FOCUS_RING} ${
    isActive
      ? "bg-brand/10 text-brand"
      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left and right rails are both flex-1, so the nav between them lands
            on the true centre of the header regardless of their content. */}
        <div className="flex flex-1 justify-start">
          <Link
            to="/"
            className={`flex shrink-0 items-center gap-2.5 rounded-lg ${FOCUS_RING}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
              <LogoIcon />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SewaSathi
            </span>
          </Link>
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
                className={`hidden h-10 shrink-0 items-center justify-center rounded-full px-4 text-[0.9375rem] font-medium text-slate-700 transition hover:bg-slate-100 sm:inline-flex ${FOCUS_RING}`}
              >
                Dashboard
              </Link>
              <UserMenu
                initials={user?.initials || "CU"}
                displayName={user?.email || user?.name || "Account"}
                avatarClassName={avatarClassName}
              />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`hidden h-10 shrink-0 items-center justify-center rounded-full px-4 text-[0.9375rem] font-medium text-slate-700 transition hover:bg-slate-100 lg:inline-flex ${FOCUS_RING}`}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-brand px-5 text-[0.9375rem] font-semibold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-dark hover:shadow-md hover:shadow-brand/30 active:scale-[0.98] focus-visible:ring-offset-2 ${FOCUS_RING}`}
              >
                Sign Up
              </Link>
            </>
          )}

          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden ${FOCUS_RING}`}
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
          className="max-h-[calc(100svh-72px)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 lg:hidden"
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
            <li className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className={`inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 text-[0.9375rem] font-medium text-slate-700 transition hover:bg-slate-50 ${FOCUS_RING}`}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 text-[0.9375rem] font-medium text-slate-700 transition hover:bg-slate-50 ${FOCUS_RING}`}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full bg-brand text-[0.9375rem] font-semibold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.99] ${FOCUS_RING}`}
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
