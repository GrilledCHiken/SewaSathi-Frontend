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
        `${worker.name} has taken your task. Pay the 10% advance to confirm it.`,
      );
      onClose();
      navigate("/dashboard/tasks");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not assign this worker.");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900">Hire {worker.name}</h3>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading your open tasks...</p>
        ) : openTasks.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Assign {worker.name} directly to one of your open tasks. You&apos;ll pay
              a 10% advance from My Tasks to confirm the booking.
            </p>
            <label htmlFor="hire-task-select" className="mt-4 block text-sm font-semibold text-slate-800">
              Select a task
            </label>
            <select
              id="hire-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {openTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning}
                className="flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigning ? "Assigning..." : "Assign to Task"}
              </button>
              <button
                type="button"
                onClick={goPostNewTask}
                className="flex-1 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Post a New Task
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              You don&apos;t have any open tasks yet. Post a new task and{" "}
              {worker.name} will be assigned to it directly.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={goPostNewTask}
                className="flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Post a New Task
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const compactSelect =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-auto";

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
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Browse Workers
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Find trusted professionals for your tasks.
            </p>
          </div>

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

          {/* Result count + removable chips for the dropdown filters */}
          {!loading && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm font-medium text-slate-600">
                {filteredWorkers.length} worker
                {filteredWorkers.length !== 1 ? "s" : ""} found
              </p>

              {location !== "All Locations" && (
                <ActiveFilterChip
                  label={location}
                  onClear={() => setLocation("All Locations")}
                />
              )}
              {rateBand !== "any" && (
                <ActiveFilterChip
                  label={rateBandFor(rateBand).label}
                  onClear={() => setRateBand("any")}
                />
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-brand transition hover:text-brand-dark"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Clear all filters
                </button>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredWorkers.map((worker) => (
                <li key={worker.id}>
                  <WorkerCard worker={worker} onHire={setHireWorker} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {hireWorker && (
        <HireModal worker={hireWorker} onClose={() => setHireWorker(null)} />
      )}
    </div>
  );
}
