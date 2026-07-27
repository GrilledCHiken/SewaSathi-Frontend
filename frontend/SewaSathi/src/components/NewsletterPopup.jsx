import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { subscribeToNewsletter } from "../api/newsletterApi";

const STORAGE_KEY = "sewasathi_newsletter_popup";
/** How long a dismissal is honoured before the invitation may reappear. */
const DISMISS_DAYS = 30;
/** Reading time before the invitation is offered, in milliseconds. */
const DWELL_MS = 20_000;

function shouldShow() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;

    const state = JSON.parse(raw);
    // Someone who has already signed up is never asked again.
    if (state.subscribed) return false;
    if (!state.dismissedAt) return true;

    const daysSince = (Date.now() - state.dismissedAt) / 86_400_000;
    return daysSince > DISMISS_DAYS;
  } catch {
    // A corrupt or unavailable localStorage should not stop the page working.
    return false;
  }
}

function remember(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-browsing modes can refuse writes; the popup simply reappears next visit.
  }
}

/**
 * Newsletter subscription invitation.
 *
 * Appears once the visitor has been reading for a while, or when the pointer leaves toward
 * the browser chrome — both signals that they have seen something, rather than interrupting
 * the moment the page loads. A dismissal is remembered for a month, and subscribing
 * suppresses it permanently.
 */
export default function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  // Guards against the dwell timer and exit-intent both firing.
  const triggered = useRef(false);

  const trigger = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!shouldShow()) return undefined;

    const timer = setTimeout(trigger, DWELL_MS);

    // Exit intent: the pointer crossing the top edge usually means the tab or address bar.
    // Ignored on touch devices, where there is no pointer and no such gesture.
    const onMouseOut = (event) => {
      if (!event.relatedTarget && event.clientY <= 0) {
        trigger();
      }
    };
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [trigger]);

  const dismiss = useCallback(() => {
    setOpen(false);
    remember({ dismissedAt: Date.now() });
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    // Escape closes it, like any other dialog.
    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await subscribeToNewsletter(trimmed);
      remember({ subscribed: true });
      setOpen(false);
      toast.success("You're subscribed! Watch your inbox for updates.");
    } catch {
      toast.error("Could not subscribe right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      // Clicking the backdrop dismisses; clicks inside the card must not bubble out to it.
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="newsletter-popup-title" className="text-lg font-bold text-slate-900">
            Get local service tips
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="-m-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-600">
          Occasional emails about trusted workers, seasonal home care, and offers in your
          city. No spam, and you can unsubscribe any time.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="newsletter-popup-email">
            Email address
          </label>
          <input
            id="newsletter-popup-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "Subscribing…" : "Subscribe"}
          </button>
        </form>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
