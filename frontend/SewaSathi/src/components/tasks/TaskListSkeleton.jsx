/** Placeholder rows shaped like the collapsed TaskCard, so nothing shifts on load. */
export default function TaskListSkeleton({ rows = 4 }) {
  return (
    <ul className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <li
          key={index}
          className="rounded-xl border border-line bg-surface p-3.5 shadow-e1 sm:p-4"
        >
          <div className="flex animate-pulse items-start gap-3 sm:gap-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-line" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-1/3 rounded bg-line" />
                <div className="h-4 w-16 rounded bg-line" />
              </div>
              <div className="mt-2 h-3 w-2/3 rounded bg-surface-sunken" />
              <div className="mt-3 h-3 w-1/4 rounded bg-surface-sunken" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
