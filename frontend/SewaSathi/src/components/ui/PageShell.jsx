import { cn } from "../../utils/cn";

/**
 * The dashboard page skeleton, which ten customer pages and every admin and
 * worker page repeated verbatim:
 *
 *   <div className="flex min-h-svh flex-1 flex-col">
 *     <SomeHeader />
 *     <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8"> … </main>
 *   </div>
 *
 * `header` is a slot rather than a hardcoded <DashboardHeader/>. That matters:
 * MyProfile switches between the admin and customer headers based on role, and
 * ChatPage takes its header as a `renderHeader` prop — baking one in would
 * break both.
 */

const WIDTHS = Object.freeze({
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
});

export default function PageShell({
  header,
  width = "xl",
  className = "",
  mainClassName = "",
  children,
}) {
  return (
    <div className={cn("flex min-h-svh flex-1 flex-col bg-surface-muted", className)}>
      {header}
      <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8", mainClassName)}>
        <div className={cn("mx-auto w-full", WIDTHS[width] || WIDTHS.xl)}>
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Page title block: optional eyebrow and back link, the heading, a lede, and a
 * right-aligned action cluster.
 *
 * This is the dashboard sibling of `User/SectionHeading.jsx` — kept separate
 * rather than merged because SectionHeading wraps itself in `Reveal`, and a
 * dashboard heading that faded in on scroll would feel broken.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {back}
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
