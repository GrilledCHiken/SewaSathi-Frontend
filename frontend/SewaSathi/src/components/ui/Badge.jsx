import { cn } from "../../utils/cn";
import { toneOf } from "./tones";

/**
 * Small status pill. Generalises `tasks/StatusBadge.jsx`, which was locked to
 * task statuses and to one size.
 *
 * `dot` draws the leading indicator; pass `pulse` for states that mean "this is
 * happening right now" (in progress, awaiting payment). The pulse is purely
 * decorative and is already covered by the reduced-motion block in index.css.
 */

const SIZES = Object.freeze({
  sm: "px-2 py-0.5 text-[11px] gap-1.5",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
});

export default function Badge({
  tone = "neutral",
  size = "sm",
  variant = "soft",
  dot = false,
  pulse = false,
  icon = null,
  className = "",
  children,
  ...rest
}) {
  const t = toneOf(tone);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-semibold capitalize",
        SIZES[size] || SIZES.sm,
        variant === "solid" ? t.solid : t.soft,
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            t.dot,
            pulse && "animate-pulse",
          )}
          aria-hidden="true"
        />
      )}
      {icon}
      {children}
    </span>
  );
}
