import { cn } from "../../utils/cn";

/**
 * The one spinner. Replaces four hand-rolled variants that differed in size,
 * border width and track colour (App.jsx's route fallback, WorkerLayout's gate,
 * PaymentResult's verifying state, and assorted inline ones).
 *
 * Decorative by default: a spinner alone tells a screen reader nothing useful,
 * so the surrounding region should carry the `role="status"` and the label.
 * `LoadingBlock` below does exactly that.
 */

const SIZES = Object.freeze({
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-2",
  xl: "h-10 w-10 border-[3px]",
});

export default function Spinner({ size = "md", className = "" }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent",
        SIZES[size] || SIZES.md,
        className,
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Centred spinner plus label, for a whole region that is still loading.
 * This is the piece that carries the live-region semantics.
 */
export function LoadingBlock({ label = "Loading…", className = "", minHeight = "min-h-40" }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-ink-muted",
        minHeight,
        className,
      )}
    >
      <Spinner size="lg" className="text-brand" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
