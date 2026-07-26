import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { assignWorker, createTask } from "../api/taskApi";

const SERVICE_CATEGORIES = [
  "Furniture Assembly",
  "Mounting",
  "Cleaning",
  "Moving Help",
  "Gardening",
  "Delivery Help",
  "Painting",
  "Electrician",
  "Plumbing",
  "Outdoor Help",
  "Heavy Lifting",
  "Home Repair",
  "Office Support",
  "Other",
];

const TIME_PREFERENCES = ["Flexible", "Morning", "Afternoon", "Evening"];

const MAX_DESCRIPTION = 500;

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function CustomerPostTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetWorkerId = searchParams.get("workerId");
  const targetWorkerName = searchParams.get("workerName");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    city: "Kathmandu",
    location: "",
    budget: "",
    hourlyRate: "",
    dueDate: "",
    timePreference: "Flexible",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "description" ? value.slice(0, MAX_DESCRIPTION) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const selectCategory = (category) => {
    setForm((prev) => ({ ...prev, category }));
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: "" }));
    }
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Please enter a task title.";
    if (!form.category) next.category = "Please select a service category.";
    if (!form.description.trim()) next.description = "Please describe your task.";
    if (!form.city.trim()) next.city = "Please enter a city.";
    if (!form.location.trim()) next.location = "Please enter a specific location.";
    if (!form.budget.trim()) {
      next.budget = "Please enter a budget.";
    } else if (Number.isNaN(Number(form.budget)) || Number(form.budget) <= 0) {
      next.budget = "Please enter a valid budget.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        city: form.city.trim(),
        location: form.location.trim(),
        budget: Number(form.budget),
        hourlyRate: form.hourlyRate.trim() ? Number(form.hourlyRate) : null,
        dueDate: form.dueDate || null,
        timePreference: form.timePreference,
      });

      if (targetWorkerId) {
        try {
          await assignWorker(task.id, targetWorkerId);
        } catch (err) {
          toast.error(
            err.response?.data?.message ||
              `Task posted, but ${targetWorkerName || "the worker"} could not be assigned.`
          );
        }
      }

      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not post your task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Post a New Task
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Describe what you need done and set your budget.
            </p>
          </div>

          {targetWorkerId && !submitted && (
            <div className="mb-6 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm font-medium text-brand">
              This task will be posted and given directly to{" "}
              {targetWorkerName || "the selected worker"}. A 10% advance confirms the
              booking.
            </div>
          )}

          {submitted ? (
            <div
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8"
              role="status"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </span>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Task posted successfully!
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                {targetWorkerId
                  ? `${targetWorkerName || "The selected worker"} has taken your task. Pay the 10% advance from My Tasks to confirm it.`
                  : "Your task is now live. Verified workers in your area can view and apply shortly."}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/dashboard/tasks"
                  className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  View My Tasks
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      title: "",
                      category: "",
                      description: "",
                      city: "Kathmandu",
                      location: "",
                      budget: "",
                      hourlyRate: "",
                      dueDate: "",
                      timePreference: "Flexible",
                    });
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Post Another Task
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            >
              {/* Task title */}
              <div>
                <label
                  htmlFor="title"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Task Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Help me move furniture to new apartment"
                  className={inputClassName}
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Service category */}
              <div className="mt-6">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Service Category
                </span>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((cat) => {
                    const selected = form.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => selectCategory(cat)}
                        className={[
                          "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                          selected
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                        ].join(" ")}
                        aria-pressed={selected}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {errors.category && (
                  <p className="mt-2 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div className="mt-6">
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Description
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the task in detail. Include any tools, materials, or special requirements."
                    className={`${inputClassName} resize-y min-h-[140px] pb-8`}
                    aria-invalid={Boolean(errors.description)}
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">
                    {form.description.length}/{MAX_DESCRIPTION}
                  </span>
                </div>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Location */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="city"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange}
                    className={inputClassName}
                    aria-invalid={Boolean(errors.city)}
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="location"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Specific Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g., Lazimpat, near Police Station"
                    className={inputClassName}
                    aria-invalid={Boolean(errors.location)}
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                  )}
                </div>
              </div>

              {/* Budget & date */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    htmlFor="budget"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Budget (NPR)
                  </label>
                  <input
                    id="budget"
                    name="budget"
                    type="text"
                    inputMode="numeric"
                    value={form.budget}
                    onChange={handleChange}
                    placeholder="e.g., 2000"
                    className={inputClassName}
                    aria-invalid={Boolean(errors.budget)}
                  />
                  {errors.budget && (
                    <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="hourlyRate"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Hourly Rate (Optional)
                  </label>
                  <input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="text"
                    inputMode="numeric"
                    value={form.hourlyRate}
                    onChange={handleChange}
                    placeholder="e.g., 300"
                    className={inputClassName}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label
                    htmlFor="dueDate"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              </div>

              {/* Time preference */}
              <fieldset className="mt-6">
                <legend className="mb-3 text-sm font-semibold text-slate-800">
                  Time Preference
                </legend>
                <div className="flex flex-wrap gap-4 sm:gap-6">
                  {TIME_PREFERENCES.map((option) => (
                    <label
                      key={option}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <input
                        type="radio"
                        name="timePreference"
                        value={option}
                        checked={form.timePreference === option}
                        onChange={handleChange}
                        className="h-4 w-4 border-slate-300 text-brand focus:ring-brand/30"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Actions */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
                >
                  {!loading && (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m22 2-7 20-4-9-9-4 20-2z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  )}
                  {loading ? "Posting..." : "Post Task"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
