import { cn } from "../../utils/cn";

/**
 * "Nothing here yet" panel.
 *
 * Generalised from `tasks/TaskEmptyState.jsx`, which was already generic
 * despite its name — that file now re-exports this one so its existing call
 * sites on the customer and worker task surfaces don't have to move.
 *
 * A good empty state says what would be here and offers the action that fills
 * it, which is why `action` is a first-class slot rather than something callers
 * bolt on underneath.
 */
/**
 * `tone`:
 *   dashed — standalone panel with a dashed outline (the default)
 *   solid  — standalone panel with a solid border and elevation
 *   bare   — no border or background, for use inside a Card/Panel that already
 *            provides them. Exposed as a prop rather than left to callers
 *            passing `border-0`, because cn() does not resolve conflicting
 *            utilities — see utils/cn.js.
 */
const TONES = Object.freeze({
  dashed: "border border-dashed border-line-strong bg-surface",
  solid: "border border-line bg-surface shadow-e1",
  bare: "",
});

export default function EmptyState({
  icon,
  title,
  body,
  action,
  tone = "dashed",
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card px-6 py-12 text-center",
        TONES[tone] ?? TONES.dashed,
        className,
      )}
    >
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
          {icon}
        </span>
      )}

      {title && <p className="text-sm font-bold text-ink">{title}</p>}
      {body && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
