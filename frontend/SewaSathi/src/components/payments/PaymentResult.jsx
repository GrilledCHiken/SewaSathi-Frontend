/**
 * The outcome cards both gateway callback pages land on. eSewa and Khalti differ
 * only in how they hand the browser back, so everything the customer actually sees
 * lives here rather than being written twice.
 */

export function CheckIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}

export function CrossIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

export const PRIMARY_BTN =
  "inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark";

export const SECONDARY_BTN =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand/30 hover:text-brand";

export function ResultCard({ tone, icon, title, body, children }) {
  const tones = {
    emerald: {
      card: "border-emerald-200 bg-emerald-50",
      tile: "bg-emerald-100 text-emerald-600",
    },
    rose: {
      card: "border-rose-200 bg-rose-50",
      tile: "bg-rose-100 text-rose-600",
    },
  };
  const style = tones[tone];
  return (
    <div className={`rounded-2xl border p-6 text-center sm:p-8 ${style.card}`} role="status">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${style.tile}`}
      >
        {icon}
      </span>
      <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
      <div className="mx-auto mt-2 max-w-md text-sm text-slate-600">{body}</div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">{children}</div>
    </div>
  );
}

/** Shown while the backend asks the gateway whether the money actually arrived. */
export function VerifyingCard({ gateway }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
      <p className="mt-4 text-sm font-semibold text-slate-700">
        Confirming your payment with {gateway}...
      </p>
      <p className="mt-1 text-xs text-slate-500">
        This only takes a moment. Please don&apos;t close this page.
      </p>
    </div>
  );
}
