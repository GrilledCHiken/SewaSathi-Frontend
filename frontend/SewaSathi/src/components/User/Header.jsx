import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Safety", href: "/safety" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

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

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
            <LogoIcon />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            SewaSathi
          </span>
        </Link>

        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-[0.9375rem] font-medium text-slate-600 transition hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link
            to="/login"
            className="text-[0.9375rem] font-medium text-slate-600 transition hover:text-slate-900"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-brand px-5 py-2.5 text-[0.9375rem] font-semibold text-white shadow-md shadow-brand/20 transition hover:bg-brand-dark active:scale-[0.98]"
          >
            Sign Up
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
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

      {mobileOpen && (
        <nav
          className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50 hover:text-brand"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2.5 text-center font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand px-3 py-2.5 text-center font-semibold text-white hover:bg-brand-dark"
                onClick={() => setMobileOpen(false)}
              >
                Sign Up
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
