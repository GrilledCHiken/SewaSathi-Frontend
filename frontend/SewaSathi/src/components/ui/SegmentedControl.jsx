import { cn } from "../../utils/cn";

/**
 * Pill-style filter row — payment transaction filters, review star filters, the
 * admin analytics period toggle.
 *
 * Uses `aria-pressed` toggle buttons rather than a radio group, matching what
 * `TaskFilterBar` and the checkout method picker already do, so the interaction
 * model stays consistent across the app.
 *
 * `counts` is optional; when a filter has one it renders as a trailing chip,
 * which is what makes "Completed (0)" discoverable without clicking it.
 */
export default function SegmentedControl({
  options = [],
  value,
  onChange,
  counts,
  size = "md",
  ariaLabel,
  className = "",
}) {
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-e1",
        className,
      )}
    >
      {options.map((option) => {
        const key = option.value ?? option;
        const label = option.label ?? option;
        const active = key === value;
        const count = counts?.[key];

        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold transition duration-200 ease-out-soft focus-ring",
              pad,
              active
                ? "bg-brand text-white shadow-e1"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
            )}
          >
            {label}
            {count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-white/25 text-white" : "bg-surface-sunken text-ink-muted",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
