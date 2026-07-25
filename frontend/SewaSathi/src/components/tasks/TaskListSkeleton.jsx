/** Placeholder rows shaped like the collapsed TaskCard, so nothing shifts on load. */
export default function TaskListSkeleton({ rows = 4 }) {
  return (
    <ul className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <li
          key={index}
          className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4"
        >
          <div className="flex animate-pulse items-start gap-3 sm:gap-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-200" />
              </div>
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              <div className="mt-3 h-3 w-1/4 rounded bg-slate-100" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
