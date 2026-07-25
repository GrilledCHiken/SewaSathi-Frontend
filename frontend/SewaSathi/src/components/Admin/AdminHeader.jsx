import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "../UserMenu";

function AdminHeader({ title = "Admin Dashboard" }) {
  const { user } = useAuth();
  const outletContext = useOutletContext();
  const openMobileMenu = outletContext?.openMobileMenu;

  const displayId = user?.email || user?.name || "Admin";

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
          <UserMenu initials={user?.initials || "AD"} displayName={displayId} avatarClassName="bg-brand" />
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
