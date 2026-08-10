const ACCENTS = {
  brand: {
    pill: "bg-brand text-white shadow-e1",
    input: "focus:border-brand focus:ring-brand/20",
  },
  emerald: {
    pill: "bg-emerald-600 text-white shadow-e1",
    input: "focus:border-emerald-500 focus:ring-emerald-500/20",
  },
};

/**
 * Dense filter + search toolbar for the task lists. Sticks under the dashboard
 * header at sm and up; stays inline on mobile where the header wraps to two rows.
 *
 * `trailing` renders extra controls (e.g. dropdowns) beside the search box —
 * Browse Workers uses it for its location and rate selects.
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
    <div className="z-20 mb-4 rounded-card border border-line bg-surface-muted/85 p-3 shadow-e1 backdrop-blur sm:sticky sm:top-[calc(var(--dash-header-h)+0.5rem)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {filters.length > 0 && (
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {filters.map(({ key, label }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange(key)}
                  aria-pressed={isActive}
                  className={[
                    "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium capitalize transition duration-200 ease-out-soft focus-ring",
                    isActive
                      ? tone.pill
                      : "bg-surface text-ink-muted ring-1 ring-line hover:bg-surface-muted",
                  ].join(" ")}
                >
                  {label}
                  <span
                    className={[
                      "ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                      isActive ? "bg-white/25 text-white" : "bg-surface-sunken text-ink-muted",
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
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
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
                  className={`w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 ${tone.input}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
