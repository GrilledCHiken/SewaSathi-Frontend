import { useEffect, useRef } from "react";
import { DetailField } from "../detailUi";

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * One Contact Us inquiry in full.
 *
 * Unlike AdminUserDetailModal this takes the record as a prop instead of fetching it: the list
 * endpoint already returns the whole message body, so opening a row should not cost a request.
 * The overlay and Escape behaviour follow the same dialog shape as the rest of the console.
 */
export default function AdminInquiryDetailModal({ inquiry, onToggleHandled, busy, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Focus moves to the dialog on open only; callers pass an inline onClose, so folding this
  // into the effect above would pull focus back every render.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Inquiry from ${inquiry.name}`}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-surface shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-ink">{inquiry.subject}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="truncate text-sm text-ink-muted">from {inquiry.name}</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  inquiry.handled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {inquiry.handled ? "Resolved" : "New"}
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 shrink-0 rounded-lg p-1 text-ink-faint transition hover:bg-surface-sunken hover:text-ink-body"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField label="Name" value={inquiry.name} />
            <DetailField
              label="Email"
              value={
                // A reply goes out through the admin's own mail client: the platform sends no
                // mail of its own, so this is the working path back to the sender.
                <a
                  href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.subject}`)}`}
                  className="text-brand underline underline-offset-2 hover:text-brand-dark"
                >
                  {inquiry.email}
                </a>
              }
            />
            <DetailField label="Subject" value={inquiry.subject} />
            <DetailField label="Received" value={formatDateTime(inquiry.createdAt)} />
            <DetailField label="Resolved" value={formatDateTime(inquiry.handledAt)} />
          </dl>

          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">Message</h3>
            <p className="mt-2 whitespace-pre-wrap rounded-field bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-ink-body">
              {inquiry.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleHandled(inquiry)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
              inquiry.handled
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            ].join(" ")}
          >
            {inquiry.handled ? "Reopen" : "Mark Resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}
