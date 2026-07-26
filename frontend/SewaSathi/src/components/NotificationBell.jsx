import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  // Close on outside click and on Escape, the two ways a user expects a popover to go away.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleOpenNotification = (notification) => {
    if (!notification.read) markRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-brand transition hover:text-brand-dark"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Nothing yet. Updates about your tasks and payments will show up here.
              </p>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${
                  n.read ? "" : "bg-brand/[0.04]"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-brand"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                    {n.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {relativeTime(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
