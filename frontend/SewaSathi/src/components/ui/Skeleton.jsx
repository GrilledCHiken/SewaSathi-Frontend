import { cn } from "../../utils/cn";

/**
 * Loading placeholders.
 *
 * The app had four different loading treatments: skeletons on two surfaces,
 * bare "Loading..." text on several, a spinner on others, and opacity dimming
 * on the admin analytics widget. Skeletons are the right default anywhere the
 * final layout is known, because they reserve the space and stop the page
 * jumping when data lands.
 *
 * Always mark the placeholder region `aria-hidden` — a screen reader announcing
 * a dozen empty grey boxes is worse than silence. The surrounding region should
 * carry `role="status"` with a short label instead.
 */

export default function Skeleton({
  className = "",
  rounded = "rounded-field",
  ...rest
}) {
  return (
    <div
      className={cn("animate-pulse bg-line", rounded, className)}
      aria-hidden="true"
      {...rest}
    />
  );
}

/** A paragraph of placeholder lines; the last is short, as real text is. */
export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3",
            index === lines - 1 ? "w-2/5" : index % 2 ? "w-4/5" : "w-full",
          )}
          rounded="rounded"
        />
      ))}
    </div>
  );
}

/** Card-shaped placeholder: icon tile, heading, body lines. */
export function SkeletonCard({ className = "", lines = 2, showTile = true }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-e1",
        className,
      )}
      aria-hidden="true"
    >
      {showTile && <Skeleton className="h-11 w-11" />}
      <Skeleton className={cn("h-6 w-1/3", showTile ? "mt-4" : "")} rounded="rounded" />
      <SkeletonText lines={lines} className="mt-3" />
    </div>
  );
}
