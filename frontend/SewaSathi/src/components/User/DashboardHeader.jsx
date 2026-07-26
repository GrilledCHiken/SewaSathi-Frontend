import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import UserMenu from "../UserMenu";

function DashboardHeader({ searchPlaceholder = "Search..." }) {
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
            onClick={openMobileMenu}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
            Customer Dashboard
          </h1>
        </div>

        <form
          onSubmit={handleSearch}
          className="relative flex-1 sm:mx-auto sm:max-w-md lg:max-w-lg"
        >
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border-0 bg-slate-100 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/25"
            aria-label="Search workers"
          />
        </form>

        <div className="flex items-center justify-end gap-3 sm:shrink-0">
          {/* Was a decorative bell with a hardcoded red dot; now backed by the real feed. */}
          <NotificationBell />

          <UserMenu initials={customer?.initials || "CU"} displayName={displayId} avatarClassName="bg-brand" />
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
