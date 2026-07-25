import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
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

function SignOutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function UserMenu({ initials, displayName, avatarClassName = "bg-brand" }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { logoutCustomer } = useAuth();
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition hover:bg-slate-50"
      >
        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${avatarClassName}`}>
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 sm:inline">
          {displayName}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <SignOutIcon />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
