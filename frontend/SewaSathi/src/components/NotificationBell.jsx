import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";
import { BellIcon } from "./ui/icons";

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
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition duration-200 ease-out-soft focus-ring ${
          open
            ? "bg-surface-sunken text-brand"
            : "text-ink-muted hover:bg-surface-sunken hover:text-ink active:scale-95"
        }`}
      >
        <BellIcon className="h-[22px] w-[22px]" />
        {/* The count is already announced by the button's aria-label, so the
            badge itself stays out of the accessibility tree. */}
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
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
            {loading && <p className="px-4 py-6 text-center text-sm text-ink-muted">Loading…</p>}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                Nothing yet. Updates about your tasks and payments will show up here.
              </p>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-muted ${
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
                  <span className="block truncate text-sm font-semibold text-ink">
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                    {n.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-faint">
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
