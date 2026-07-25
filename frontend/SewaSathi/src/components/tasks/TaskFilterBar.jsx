const ACCENTS = {
  brand: {
    pill: "bg-brand text-white shadow-sm",
    input: "focus:border-brand focus:ring-brand/20",
  },
  emerald: {
    pill: "bg-emerald-600 text-white shadow-sm",
    input: "focus:border-emerald-500 focus:ring-emerald-500/20",
  },
};

/**
 * Dense filter + search toolbar for the task lists. Sticks under the dashboard
 * header at sm and up; stays inline on mobile where the header wraps to two rows.
 *
 * `trailing` renders extra controls (e.g. dropdowns) beside the search box —
 * Browse Workers uses it for its location and rate selects. The search keeps
 * `lg:w-80`, which is the width the old `w-full lg:max-w-xs` resolved to.
 */
export default function TaskFilterBar({
  filters = [],
  active,
  onChange,
  counts = {},
  search,
  onSearchChange,
  accent = "brand",
  searchPlaceholder = "Search tasks...",
  trailing = null,
}) {
  const tone = ACCENTS[accent] || ACCENTS.brand;

  return (
    <div className="z-20 -mx-4 mb-4 border-b border-slate-200/70 bg-slate-50/85 px-4 py-3 backdrop-blur sm:sticky sm:top-[var(--dash-header-h)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {filters.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map(({ key, label }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange(key)}
                  aria-pressed={isActive}
                  className={[
                    "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
                    isActive
                      ? tone.pill
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {label}
                  <span
                    className={[
                      "ml-1.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                      isActive ? "bg-black/15 text-white" : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {counts[key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(trailing || onSearchChange) && (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
            {trailing}

            {onSearchChange && (
              <div className="relative w-full lg:w-80">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className={`w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${tone.input}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
