import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function WorkerHeader({ title = "Worker Dashboard" }) {
  const { customer } = useAuth();
  const outletContext = useOutletContext();
  const openMobileMenu = outletContext?.openMobileMenu;

  const displayId = customer?.email || customer?.name || "Worker";

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
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 sm:ml-auto">
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
              {customer?.initials || "WK"}
            </span>
            <span className="hidden max-w-[160px] truncate text-sm font-medium text-slate-700 sm:inline">
              {displayId}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default WorkerHeader;
