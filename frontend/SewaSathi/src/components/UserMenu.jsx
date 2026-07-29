import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

/** Where "My Profile" goes, per role. Each dashboard hosts its own profile route. */
const PROFILE_PATH_BY_ROLE = {
  CUSTOMER: "/dashboard/profile",
  WORKER: "/worker/profile",
  ADMIN: "/admin/profile",
};

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z" />
      <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-ink-body transition hover:bg-surface-sunken";

function UserMenu({ initials, displayName, avatarClassName = "bg-brand" }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { user, logoutCustomer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    logoutCustomer();
    navigate("/login", { replace: true });
  };

  const profilePath = PROFILE_PATH_BY_ROLE[user?.role] ?? "/dashboard/profile";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 transition hover:bg-surface-muted"
      >
        <Avatar
          storedUrl={user?.avatarUrl}
          initials={initials}
          className="h-9 w-9 text-sm"
          fallbackClassName={avatarClassName}
        />
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink-body sm:inline">
          {displayName}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-lg">
          <div className="border-b border-line-soft px-3.5 pb-2.5 pt-1">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.name || "Account"}
            </p>
            <p className="truncate text-xs text-ink-muted">{user?.email}</p>
          </div>

          <Link to={profilePath} onClick={() => setOpen(false)} className={`${ITEM_CLASS} mt-1`}>
            <ProfileIcon />
            My Profile
          </Link>

          {/* Security lives under the customer dashboard only; workers and admins have
              no route for it, so linking them there would 404 into an empty outlet. */}
          {user?.role === "CUSTOMER" && (
            <Link to="/dashboard/security" onClick={() => setOpen(false)} className={ITEM_CLASS}>
              <ShieldIcon />
              Security
            </Link>
          )}

          <button type="button" onClick={handleSignOut} className={`${ITEM_CLASS} border-t border-line-soft`}>
            <SignOutIcon />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
