import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { toneOf } from "./tones";

/**
 * Headline-number tile for dashboard overviews.
 *
 * Lifted from the admin stat tile, which was the better of the two versions in
 * the app — the customer dashboard's copy omitted the hint line and used a
 * smaller numeral.
 *
 * `to` turns the whole tile into a link. Numbers are `tabular-nums` so a value
 * ticking from 9 to 10 doesn't shift the label underneath it.
 */
export default function StatTile({
  label,
  value,
  icon,
  tone = "brand",
  hint,
  to,
  className = "",
}) {
  const t = toneOf(tone);
  const Comp = to ? Link : "div";

  return (
    <Comp
      {...(to ? { to } : {})}
      className={cn(
        "group flex flex-col rounded-card border border-line bg-surface p-5 shadow-e1",
        to &&
          "transition duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-e2 motion-reduce:hover:translate-y-0 focus-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-field",
              t.tile,
            )}
          >
            {icon}
          </span>
        )}

        {to && (
          <span
            className="text-ink-faint opacity-0 transition group-hover:opacity-100"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight tabular-nums text-ink">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-ink-muted">{label}</p>
      {hint && <p className="mt-2 text-xs text-ink-faint">{hint}</p>}
    </Comp>
  );
}
