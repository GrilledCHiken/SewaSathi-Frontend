import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import TaskEmptyState from "../components/tasks/TaskEmptyState";
import TaskFilterBar from "../components/tasks/TaskFilterBar";
import { SEARCH_ICON, initialsOf, paletteFor } from "../components/tasks/taskUi.jsx";
import WorkerCard from "../components/workers/WorkerCard";
import WorkerCardSkeleton from "../components/workers/WorkerCardSkeleton";
import { listWorkers } from "../api/workerApi";
import { assignWorker, listMyTasks } from "../api/taskApi";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import { Panel } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Field";
import { LoadingBlock } from "../components/ui/Spinner";
import { SearchIcon } from "../components/ui/icons";

/** Preferred pill order. Skills outside this list are appended alphabetically. */
const SKILL_ORDER = [
  "Furniture Assembly",
  "Mounting",
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Home Repair",
  "Moving Help",
  "Gardening",
  "Painting",
];

const LOCATIONS = [
  "All Locations",
  "Kathmandu",
  "Lalitpur",
  "Pokhara",
  "Bhaktapur",
  "Biratnagar",
];

const RATE_BANDS = [
  { key: "any", label: "Any rate", min: 0, max: Infinity },
  { key: "lt500", label: "Under NPR 500", min: 0, max: 500 },
  { key: "500", label: "NPR 500 - 1,000", min: 500, max: 1000 },
  { key: "1000", label: "NPR 1,000 - 2,000", min: 1000, max: 2000 },
  { key: "2000", label: "NPR 2,000+", min: 2000, max: Infinity },
];

function rateBandFor(key) {
  return RATE_BANDS.find((band) => band.key === key) || RATE_BANDS[0];
}

function mapWorker(worker) {
  const palette = paletteFor(worker.id);
  return {
    id: worker.id,
    name: worker.fullName,
    initials: initialsOf(worker.fullName),
    avatarBg: palette.bg,
    avatarText: palette.text,
    rate: worker.hourlyRate != null ? Number(worker.hourlyRate) : 0,
    rating: worker.ratingAverage != null ? Number(worker.ratingAverage) : 0,
    reviews: worker.ratingCount ?? 0,
    location: worker.location || "Not specified",
    tasksDone: worker.tasksCompleted ?? 0,
    description: worker.bio || "This worker hasn't added a bio yet.",
    skills: worker.skills
      ? worker.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

/**
 * Sticky filter rail, shown from xl up where there is room beside the grid.
 *
 * Page-local on purpose: it is fed by exactly the same state and setters as the
 * TaskFilterBar used below xl, and TaskFilterBar's own API is left alone
 * because the worker panel's Browse Tasks screen depends on it.
 */
function WorkerFilterRail({
  skillFilters,
  skill,
  onSkillChange,
  skillCounts,
  search,
  onSearchChange,
  location,
  onLocationChange,
  rateBand,
  onRateBandChange,
  hasActiveFilters,
  onClear,
}) {
  return (
    <div className="sticky top-[calc(var(--dash-header-h)+1.5rem)] space-y-4">
      <Panel title="Filters" padding="md">
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search workers..."
          aria-label="Search workers"
          leadingIcon={<SearchIcon className="h-4 w-4" />}
          inputClassName="py-2.5 text-sm"
        />

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="rail-location"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted"
            >
              Location
            </label>
            <Select
              id="rail-location"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="py-2.5 text-sm"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label
              htmlFor="rail-rate"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted"
            >
              Hourly rate
            </label>
            <Select
              id="rail-rate"
              value={rateBand}
              onChange={(e) => onRateBandChange(e.target.value)}
              className="py-2.5 text-sm"
            >
              {RATE_BANDS.map((band) => (
                <option key={band.key} value={band.key}>
                  {band.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Panel>

      <Panel title="Skills" padding="none" bodyClassName="p-2">
        {/* A counted vertical list rather than a wrapped pill row: at this width
            the counts stay aligned and scannable. */}
        <ul className="max-h-[19rem] space-y-0.5 overflow-y-auto">
          {skillFilters.map((filter) => {
            const active = filter.key === skill;
            const count = skillCounts[filter.key] ?? 0;
            return (
              <li key={filter.key}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSkillChange(filter.key)}
                  className={[
                    "flex w-full items-center justify-between gap-2 rounded-field px-3 py-2 text-left text-sm transition focus-ring",
                    active
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "text-ink-body hover:bg-surface-sunken",
                  ].join(" ")}
                >
                  <span className="truncate">{filter.label}</span>
                  <span
                    className={[
                      "shrink-0 rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                      active ? "bg-brand text-white" : "bg-surface-sunken text-ink-muted",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      {hasActiveFilters && (
        <Button variant="secondary" size="sm" fullWidth onClick={onClear}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}

function HireModal({ worker, onClose }) {
  const navigate = useNavigate();
  const [openTasks, setOpenTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    listMyTasks("OPEN")
      .then((data) => {
        setOpenTasks(data);
        if (data.length > 0) setSelectedTaskId(String(data[0].id));
      })
      .catch(() => toast.error("Could not load your open tasks."))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selectedTaskId) return;
    setAssigning(true);
    try {
      await assignWorker(selectedTaskId, worker.id);
      toast.success(
        `Request sent to ${worker.name}. You'll be notified when they respond.`,
      );
      onClose();
      navigate("/dashboard/tasks");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send this request.");
    } finally {
      setAssigning(false);
    }
  };

  const goPostNewTask = () => {
    onClose();
    navigate(
      `/dashboard/post-task?workerId=${worker.id}&workerName=${encodeURIComponent(worker.name)}`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-panel bg-surface p-6 shadow-e3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-ink">Hire {worker.name}</h3>

        {loading ? (
          <div className="mt-4">
            <LoadingBlock label="Loading your open tasks…" minHeight="min-h-24" />
          </div>
        ) : openTasks.length > 0 ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Send {worker.name} a request for one of your open tasks. Once they
              accept, you&apos;ll pay a 10% advance from My Tasks to confirm the
              booking.
            </p>
            <label
              htmlFor="hire-task-select"
              className="mt-4 block text-sm font-semibold text-ink"
            >
              Select a task
            </label>
            <div className="mt-1.5">
              <Select
                id="hire-task-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="py-2.5 text-sm"
              >
                {openTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <Button fullWidth onClick={handleAssign} loading={assigning}>
                {assigning ? "Sending..." : "Send Request"}
              </Button>
              <Button variant="secondary" fullWidth onClick={goPostNewTask}>
                Post a New Task
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              You don&apos;t have any open tasks yet. Post a new task and{" "}
              {worker.name} will be sent a request for it directly.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <Button fullWidth onClick={goPostNewTask}>
                Post a New Task
              </Button>
              <Button variant="secondary" fullWidth onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const compactSelect =
  "w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink-body focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-auto";

/** Removable chip for a non-default dropdown filter. */
function ActiveFilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 py-1 pl-2.5 pr-1 text-xs font-medium text-brand">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 transition hover:bg-brand/15"
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

export default function CustomerBrowseWorkers() {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [skill, setSkill] = useState("all");
  const [location, setLocation] = useState("All Locations");
  const [rateBand, setRateBand] = useState("any");
  const [hireWorker, setHireWorker] = useState(null);

  useEffect(() => {
    listWorkers()
      .then((data) => setWorkers(data.map(mapWorker)))
      .catch(() => toast.error("Could not load workers."))
      .finally(() => setLoading(false));
  }, []);

  const clearFilters = () => {
    setSkill("all");
    setLocation("All Locations");
    setRateBand("any");
    setSearch("");
  };

  /* Everything except the skill filter — skill pill counts are derived from
     this so each badge shows what clicking that pill would actually return. */
  const baseMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    const { min, max } = rateBandFor(rateBand);

    return workers.filter((worker) => {
      const matchesLocation =
        location === "All Locations" || worker.location === location;
      const matchesRate = worker.rate >= min && worker.rate <= max;
      const matchesSearch =
        !query ||
        worker.name.toLowerCase().includes(query) ||
        worker.skills.some((s) => s.toLowerCase().includes(query)) ||
        worker.description.toLowerCase().includes(query);

      return matchesLocation && matchesRate && matchesSearch;
    });
  }, [workers, search, location, rateBand]);

  /* Pills come from the skills workers actually list, ordered by SKILL_ORDER
     with anything unrecognised appended alphabetically. */
  const skillFilters = useMemo(() => {
    const present = new Set();
    workers.forEach((worker) => worker.skills.forEach((s) => present.add(s)));

    const known = SKILL_ORDER.filter((s) => present.has(s));
    const extras = [...present].filter((s) => !SKILL_ORDER.includes(s)).sort();

    return [
      { key: "all", label: "All" },
      ...[...known, ...extras].map((s) => ({ key: s, label: s })),
    ];
  }, [workers]);

  const skillCounts = useMemo(() => {
    const tally = { all: baseMatches.length };
    skillFilters.slice(1).forEach(({ key }) => {
      tally[key] = baseMatches.filter((w) => w.skills.includes(key)).length;
    });
    return tally;
  }, [baseMatches, skillFilters]);

  const filteredWorkers = useMemo(
    () =>
      skill === "all"
        ? baseMatches
        : baseMatches.filter((worker) => worker.skills.includes(skill)),
    [baseMatches, skill],
  );

  const hasActiveFilters =
    skill !== "all" ||
    location !== "All Locations" ||
    rateBand !== "any" ||
    search.trim() !== "";

  return (
    <PageShell
      header={<DashboardHeader title="Browse Workers" />}
    >
      <PageHeader
        title="Browse Workers"
        description="Find trusted professionals for your tasks."
      />

      <div className="mt-5 grid gap-6 xl:grid-cols-[264px_minmax(0,1fr)]">
        {/* Rail at xl and up, where there is room beside the grid. */}
        <aside className="hidden xl:block">
          <WorkerFilterRail
            skillFilters={skillFilters}
            skill={skill}
            onSkillChange={setSkill}
            skillCounts={skillCounts}
            search={search}
            onSearchChange={setSearch}
            location={location}
            onLocationChange={setLocation}
            rateBand={rateBand}
            onRateBandChange={setRateBand}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        </aside>

        <div className="min-w-0">
          {/* Below xl the rail collapses back to the horizontal bar. */}
          <div className="xl:hidden">
            <TaskFilterBar
              filters={skillFilters}
              active={skill}
              onChange={setSkill}
              counts={skillCounts}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search workers..."
              accent="brand"
              trailing={
                <>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    aria-label="Filter by location"
                    className={compactSelect}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rateBand}
                    onChange={(e) => setRateBand(e.target.value)}
                    aria-label="Filter by hourly rate"
                    className={compactSelect}
                  >
                    {RATE_BANDS.map((band) => (
                      <option key={band.key} value={band.key}>
                        {band.label}
                      </option>
                    ))}
                  </select>
                </>
              }
            />
          </div>

          {/* Result count + removable chips for the dropdown filters */}
          {!loading && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm font-medium text-ink-muted">
                {filteredWorkers.length} worker
                {filteredWorkers.length !== 1 ? "s" : ""} found
              </p>

              <div className="xl:hidden">
                {location !== "All Locations" && (
                  <ActiveFilterChip
                    label={location}
                    onClear={() => setLocation("All Locations")}
                  />
                )}
              </div>
              <div className="xl:hidden">
                {rateBand !== "any" && (
                  <ActiveFilterChip
                    label={rateBandFor(rateBand).label}
                    onClear={() => setRateBand("any")}
                  />
                )}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={clearFilters}
                  className="xl:hidden"
                >
                  Clear all
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <WorkerCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredWorkers.length === 0 ? (
            <TaskEmptyState
              icon={SEARCH_ICON}
              title="No workers match your filters"
              body="Try a different skill, widen the rate range, or clear your search."
              action={
                <Button onClick={clearFilters}>Clear all filters</Button>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {filteredWorkers.map((worker) => (
                <li key={worker.id}>
                  <WorkerCard worker={worker} onHire={setHireWorker} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {hireWorker && (
        <HireModal worker={hireWorker} onClose={() => setHireWorker(null)} />
      )}
    </PageShell>
  );
}
