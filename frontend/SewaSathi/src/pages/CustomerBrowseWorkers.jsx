import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { listWorkers } from "../api/workerApi";
import { assignWorker, listMyTasks } from "../api/taskApi";

const SKILLS = [
  "All Skills",
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

const AVATAR_PALETTE = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
];

function initialsOf(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapWorker(worker) {
  const palette = AVATAR_PALETTE[worker.id % AVATAR_PALETTE.length];
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

function VerifiedBadge() {
  return (
    <svg className="h-4 w-4 shrink-0 text-brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
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
      toast.success(`${worker.name} has been assigned to your task.`);
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
              Assign {worker.name} directly to one of your open tasks.
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

function WorkerCard({ worker, onHire }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-brand/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${worker.avatarBg} ${worker.avatarText}`}
          >
            {worker.initials}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate font-bold text-slate-900">{worker.name}</h3>
              <VerifiedBadge />
            </div>
          </div>
        </div>
        <p className="shrink-0 text-right text-sm font-bold text-emerald-600">
          NPR {worker.rate}
          <span className="block text-xs font-medium text-slate-500">per hour</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
        <span className="inline-flex items-center gap-1">
          <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {worker.rating} ({worker.reviews})
        </span>
        <span>· {worker.location}</span>
        <span>· {worker.tasksDone} tasks done</span>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
        {worker.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {worker.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onHire(worker)}
          className="flex-1 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Hire Now
        </button>
        <button
          type="button"
          className="flex-1 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Message
        </button>
      </div>
    </article>
  );
}

const selectClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function CustomerBrowseWorkers() {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [skill, setSkill] = useState("All Skills");
  const [location, setLocation] = useState("All Locations");
  const [minRate, setMinRate] = useState("0");
  const [maxRate, setMaxRate] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [hireWorker, setHireWorker] = useState(null);

  useEffect(() => {
    listWorkers()
      .then((data) => setWorkers(data.map(mapWorker)))
      .catch(() => toast.error("Could not load workers."))
      .finally(() => setLoading(false));
  }, []);

  const clearFilters = () => {
    setSkill("All Skills");
    setLocation("All Locations");
    setMinRate("0");
    setMaxRate("");
    setSearch("");
  };

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = Number(minRate) || 0;
    const max = maxRate.trim() === "" || maxRate.toLowerCase() === "any"
      ? Infinity
      : Number(maxRate);

    return workers.filter((worker) => {
      const matchesSkill =
        skill === "All Skills" || worker.skills.includes(skill);
      const matchesLocation =
        location === "All Locations" || worker.location === location;
      const matchesRate = worker.rate >= min && worker.rate <= max;
      const matchesSearch =
        !query ||
        worker.name.toLowerCase().includes(query) ||
        worker.skills.some((s) => s.toLowerCase().includes(query)) ||
        worker.description.toLowerCase().includes(query);

      return matchesSkill && matchesLocation && matchesRate && matchesSearch;
    });
  }, [workers, search, skill, location, minRate, maxRate]);

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Page header + search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Browse Workers
              </h2>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Find trusted professionals for your tasks.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:min-w-[240px]">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or skill..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label="Search workers"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:hidden"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                Filters
              </button>
            </div>
          </div>

          {/* Filter card */}
          <div
            className={[
              "mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6",
              showFilters ? "block" : "hidden lg:block",
            ].join(" ")}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="filter-skill" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Skill
                </label>
                <select
                  id="filter-skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className={selectClassName}
                >
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-location" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Location
                </label>
                <select
                  id="filter-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={selectClassName}
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-min-rate" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Min Rate (NPR)
                </label>
                <input
                  id="filter-min-rate"
                  type="number"
                  min="0"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                  className={selectClassName}
                />
              </div>
              <div>
                <label htmlFor="filter-max-rate" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Max Rate (NPR)
                </label>
                <input
                  id="filter-max-rate"
                  type="text"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  placeholder="Any"
                  className={selectClassName}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-brand transition hover:text-brand-dark"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Results */}
          {!loading && (
            <p className="mt-6 text-sm font-medium text-slate-600">
              {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? "s" : ""} found
            </p>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading workers...</p>
          ) : filteredWorkers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-slate-600">
                No workers match your search. Try adjusting your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold text-brand hover:text-brand-dark"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredWorkers.map((worker) => (
                <li key={worker.id} className="flex">
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
