import { cn } from "../../utils/cn";
import { CheckIcon } from "./icons";

/**
 * Large selectable card — payment method picker, the customer/worker signup
 * choice, category tiles.
 *
 * Follows the `aria-pressed` toggle-button model the checkout page already
 * uses, so migrating those call sites is a markup change rather than a
 * behavioural one.
 *
 * `unavailable` is kept distinct from `disabled`: eSewa and Khalti can each be
 * switched off by config, and that reads differently from a control disabled
 * because a request is in flight.
 */
export default function RadioCard({
  selected = false,
  onSelect,
  icon,
  title,
  description,
  badge,
  disabled = false,
  unavailable = false,
  className = "",
  children,
}) {
  const inert = disabled || unavailable;

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={inert}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-card border p-4 text-left",
        "transition duration-200 ease-out-soft focus-ring",
        selected
          ? "border-brand bg-brand-50/60 shadow-e2 ring-1 ring-brand/30"
          : "border-line bg-surface shadow-e1 hover:border-brand/40 hover:bg-brand-50/30",
        inert && "cursor-not-allowed opacity-55 hover:border-line hover:bg-surface",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-field transition",
            selected
              ? "bg-brand text-white"
              : "bg-surface-sunken text-ink-muted group-hover:bg-brand-50 group-hover:text-brand",
          )}
        >
          {icon}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink">{title}</span>
          {badge}
          {unavailable && (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              Unavailable
            </span>
          )}
        </span>
        {description && (
          <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
            {description}
          </span>
        )}
        {children}
      </span>

      {/* Selection tick. Reserved space avoids a reflow when it appears. */}
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
          selected
            ? "border-brand bg-brand text-white"
            : "border-line-strong bg-surface text-transparent",
        )}
        aria-hidden="true"
      >
        <CheckIcon className="h-3 w-3" />
      </span>
    </button>
  );
}
