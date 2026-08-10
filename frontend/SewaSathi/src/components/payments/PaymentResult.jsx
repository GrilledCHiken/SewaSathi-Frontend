import Card from "../ui/Card";
import Spinner from "../ui/Spinner";
import { cn } from "../../utils/cn";

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

const TONES = {
  emerald: { card: "border-success/25 bg-success-soft", tile: "bg-white text-success" },
  rose: { card: "border-danger/25 bg-danger-soft", tile: "bg-white text-danger" },
};

export function ResultCard({ tone, icon, title, body, children }) {
  const style = TONES[tone] || TONES.emerald;

  return (
    <Card
      padding="xl"
      radius="panel"
      className={cn("text-center", style.card)}
      role="status"
    >
      <span
        className={cn(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-e1",
          style.tile,
        )}
      >
        {icon}
      </span>
      <h3 className="mt-4 text-xl font-extrabold tracking-tight text-ink">{title}</h3>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-body">
        {body}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {children}
      </div>
    </Card>
  );
}

/** Shown while the backend asks the gateway whether the money actually arrived. */
export function VerifyingCard({ gateway }) {
  return (
    <Card padding="xl" radius="panel" className="text-center" role="status">
      <Spinner size="xl" className="mx-auto text-brand" />
      <p className="mt-4 text-sm font-semibold text-ink-body">
        Confirming your payment with {gateway}...
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        This only takes a moment. Please don&apos;t close this page.
      </p>
    </Card>
  );
}
