import { cn } from "../../utils/cn";

/**
 * The surface primitive. The idiom this replaces —
 * `rounded-2xl border border-slate-200/80 bg-white shadow-sm` — appeared 32
 * times across 16 files, with the radius drifting between xl and 2xl and the
 * hover treatment present on some cards but not others.
 *
 * `interactive` adds the lift-on-hover used by cards that are themselves links
 * or buttons. Do not set it on a static card: a surface that moves under the
 * cursor but does nothing when clicked is a false affordance.
 */

const PADDING = Object.freeze({
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  xl: "p-6 sm:p-8",
});

const RADIUS = Object.freeze({
  card: "rounded-card",
  panel: "rounded-panel",
});

export default function Card({
  as: Comp = "div",
  padding = "md",
  radius = "card",
  interactive = false,
  muted = false,
  className = "",
  children,
  ...rest
}) {
  return (
    <Comp
      className={cn(
        "border border-line shadow-e1",
        muted ? "bg-surface-muted" : "bg-surface",
        RADIUS[radius] || RADIUS.card,
        PADDING[padding] ?? PADDING.md,
        interactive &&
          "transition duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-e2 motion-reduce:hover:translate-y-0 focus-ring",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/**
 * A Card with a titled header row and an optional trailing action — the
 * "section heading + View all link + body" shape that every dashboard column
 * was assembling by hand.
 *
 * The heading level is a prop because the correct one depends on the page's
 * outline, not on how the panel looks.
 */
export function Panel({
  title,
  description,
  action,
  headingAs: Heading = "h3",
  padding = "md",
  bodyClassName = "",
  className = "",
  children,
  ...rest
}) {
  return (
    <Card padding="none" className={cn("overflow-hidden", className)} {...rest}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div className="min-w-0">
            {title && (
              <Heading className="truncate text-base font-bold text-ink">
                {title}
              </Heading>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(PADDING[padding] ?? PADDING.md, bodyClassName)}>
        {children}
      </div>
    </Card>
  );
}
