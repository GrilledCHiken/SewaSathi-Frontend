import { cn } from "../../utils/cn";
import { toneOf } from "./tones";

/**
 * A labelled proportion bar — CSS only, no chart library. Used by the breakdown bars in
 * `Admin/AnalyticsWidget.jsx`.
 *
 * Exposed as a real `progressbar` with min/max/now, so the value reaches assistive tech
 * rather than being conveyed by bar width alone.
 */
export default function Meter({
  label,
  value,
  max = 100,
  tone = "brand",
  displayValue,
  className = "",
}) {
  const t = toneOf(tone);
  const safeMax = max > 0 ? max : 1;
  // Clamped so a value above max can't overflow the track.
  const pct = Math.max(0, Math.min(100, (Number(value) / safeMax) * 100));

  return (
    <div className={cn("min-w-0", className)}>
      {(label || displayValue != null) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <span className="truncate text-sm font-medium text-ink-body">
              {label}
            </span>
          )}
          {displayValue != null && (
            <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
              {displayValue}
            </span>
          )}
        </div>
      )}

      <div
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Number(value) || 0}
        aria-label={label || undefined}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out-soft", t.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
