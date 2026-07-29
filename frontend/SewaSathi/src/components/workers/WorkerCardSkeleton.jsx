/**
 * Placeholder shaped like WorkerCard. The blocks mirror that card's locked
 * region heights (h-12 identity, h-10 bio, h-7 skills) so the grid does not
 * shift when the real workers arrive.
 */
export default function WorkerCardSkeleton() {
  return (
    <div
      className="flex h-full animate-pulse flex-col rounded-2xl border border-line bg-surface p-5 shadow-e1"
      aria-hidden="true"
    >
      <div className="flex h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-line" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-28 rounded bg-line" />
            <div className="mt-2 h-3 w-20 rounded bg-line" />
          </div>
        </div>
        <div className="shrink-0 space-y-1.5">
          <div className="h-4 w-16 rounded bg-line" />
          <div className="ml-auto h-3 w-10 rounded bg-line" />
        </div>
      </div>

      <div className="mt-4 h-3.5 w-2/3 rounded bg-line" />

      <div className="mt-3 h-10 space-y-1.5">
        <div className="h-4 w-full rounded bg-line" />
        <div className="h-4 w-4/5 rounded bg-line" />
      </div>

      <div className="mt-4 flex h-7 items-center gap-1.5">
        <div className="h-6 w-20 rounded-full bg-line" />
        <div className="h-6 w-16 rounded-full bg-line" />
        <div className="h-6 w-10 rounded-full bg-line" />
      </div>

      <div className="mt-auto flex gap-2 pt-5">
        <div className="h-10 flex-1 rounded-full bg-line" />
        <div className="h-10 flex-1 rounded-full bg-line" />
      </div>
    </div>
  );
}
