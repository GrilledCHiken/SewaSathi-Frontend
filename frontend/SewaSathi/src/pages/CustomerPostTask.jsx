import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardHeader from "../components/User/DashboardHeader";
import { assignWorker, createTask } from "../api/taskApi";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import Card, { Panel } from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Field, Input, Textarea, CharCount } from "../components/ui/Field";
import { CheckCircleIcon, SendIcon } from "../components/ui/icons";
import {
  advanceFor,
  categoryMeta,
  formatMoney,
  remainingAfter,
} from "../components/tasks/taskUi.jsx";

/**
 * Post a task.
 *
 * Was a single 240-line <form> in one card, where the submit button sat some
 * 400px below the fold. It is now three grouped panels on the left with a
 * sticky summary rail on the right, so the action is always reachable and the
 * form reads as three short steps rather than one long one.
 *
 * The rail's figures are derived from form state that already existed and the
 * `advanceFor` / `remainingAfter` helpers already exported by taskUi — no new
 * state, no new requests.
 */

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

const EMPTY_FORM = {
  title: "",
  category: "",
  description: "",
  city: "Kathmandu",
  location: "",
  budget: "",
  hourlyRate: "",
  dueDate: "",
  timePreference: "Flexible",
};

export default function CustomerPostTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetWorkerId = searchParams.get("workerId");
  const targetWorkerName = searchParams.get("workerName");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);

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

  const header = <DashboardHeader title="Post a Task" searchPlaceholder="Search workers..." />;

  if (submitted) {
    return (
      <PageShell header={header} width="md">
        <Card padding="xl" radius="panel" className="text-center" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-xl font-extrabold tracking-tight text-ink">
            Task posted successfully!
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            {targetWorkerId
              ? `${targetWorkerName || "The selected worker"} has taken your task. Pay the 10% advance from My Tasks to confirm it.`
              : "Your task is now live. Verified workers in your area can view and apply shortly."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button as={Link} to="/dashboard/tasks">
              View My Tasks
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSubmitted(false);
                setForm(EMPTY_FORM);
              }}
            >
              Post Another Task
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const budgetValue = Number(form.budget);
  const hasBudget = form.budget.trim() !== "" && !Number.isNaN(budgetValue) && budgetValue > 0;

  return (
    <PageShell header={header}>
      <PageHeader
        title="Post a New Task"
        description="Describe what you need done and set your budget."
      />

      {targetWorkerId && (
        <Alert tone="brand" className="mt-6">
          This task will be posted and given directly to{" "}
          <strong className="font-semibold">
            {targetWorkerName || "the selected worker"}
          </strong>
          . A 10% advance confirms the booking.
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* -------------------------------------------------------------- */}
          {/* Left: the form itself, in three grouped steps                   */}
          {/* -------------------------------------------------------------- */}
          <div className="space-y-6 lg:col-span-2">
            <Panel title="What do you need?" padding="lg">
              <Field id="title" label="Task Title" error={errors.title}>
                {(field) => (
                  <Input
                    {...field}
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g., Help me move furniture to new apartment"
                  />
                )}
              </Field>

              <div className="mt-5">
                <span className="mb-2.5 block text-sm font-semibold text-ink">
                  Service Category
                </span>
                {/* Category chips now carry the icons already defined in
                    taskUi's CATEGORY_META — all fourteen had one. */}
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((cat) => {
                    const selected = form.category === cat;
                    const meta = categoryMeta(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => selectCategory(cat)}
                        aria-pressed={selected}
                        className={[
                          "inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition duration-200 ease-out-soft focus-ring",
                          selected
                            ? "border-brand bg-brand-50 text-brand-700 shadow-e1"
                            : "border-line bg-surface text-ink-body hover:border-brand/40 hover:bg-brand-50/40",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
                            selected ? "bg-brand text-white" : meta.tile,
                          ].join(" ")}
                        >
                          {meta.icon}
                        </span>
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {errors.category && (
                  <p className="mt-2 text-sm font-medium text-danger">
                    {errors.category}
                  </p>
                )}
              </div>

              <Field
                id="description"
                label="Description"
                error={errors.description}
                className="mt-5"
                labelSuffix={
                  <CharCount value={form.description} max={MAX_DESCRIPTION} />
                }
              >
                {(field) => (
                  <Textarea
                    {...field}
                    name="description"
                    rows={5}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the task in detail. Include any tools, materials, or special requirements."
                    className="min-h-[140px]"
                  />
                )}
              </Field>
            </Panel>

            <Panel title="Where" padding="lg">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="city" label="City" error={errors.city}>
                  {(field) => (
                    <Input
                      {...field}
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={handleChange}
                    />
                  )}
                </Field>

                <Field
                  id="location"
                  label="Specific Location"
                  error={errors.location}
                >
                  {(field) => (
                    <Input
                      {...field}
                      name="location"
                      type="text"
                      value={form.location}
                      onChange={handleChange}
                      placeholder="e.g., Lazimpat, near Police Station"
                    />
                  )}
                </Field>
              </div>
            </Panel>

            <Panel title="Budget & timing" padding="lg">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field id="budget" label="Budget (NPR)" error={errors.budget}>
                  {(field) => (
                    <Input
                      {...field}
                      name="budget"
                      type="text"
                      inputMode="numeric"
                      value={form.budget}
                      onChange={handleChange}
                      placeholder="e.g., 2000"
                    />
                  )}
                </Field>

                <Field id="hourlyRate" label="Hourly Rate (Optional)">
                  {(field) => (
                    <Input
                      {...field}
                      name="hourlyRate"
                      type="text"
                      inputMode="numeric"
                      value={form.hourlyRate}
                      onChange={handleChange}
                      placeholder="e.g., 300"
                    />
                  )}
                </Field>

                <Field
                  id="dueDate"
                  label="Due Date"
                  className="sm:col-span-2 lg:col-span-1"
                >
                  {(field) => (
                    <Input
                      {...field}
                      name="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={handleChange}
                    />
                  )}
                </Field>
              </div>

              <fieldset className="mt-5">
                <legend className="mb-3 text-sm font-semibold text-ink">
                  Time Preference
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TIME_PREFERENCES.map((option) => {
                    const selected = form.timePreference === option;
                    return (
                      <label
                        key={option}
                        className={[
                          "inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition duration-200 ease-out-soft",
                          selected
                            ? "border-brand bg-brand-50 text-brand-700"
                            : "border-line bg-surface text-ink-body hover:border-brand/40",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="timePreference"
                          value={option}
                          checked={selected}
                          onChange={handleChange}
                          className="h-4 w-4 border-line-strong text-brand focus:ring-brand/30"
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Panel>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Right: sticky summary + actions                                 */}
          {/* -------------------------------------------------------------- */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-[calc(var(--dash-header-h)+1.5rem)]">
              <Panel title="Summary" padding="lg">
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-ink-muted">Task</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {form.title.trim() || (
                        <span className="font-normal text-ink-faint">
                          Not set yet
                        </span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-ink-muted">Category</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {form.category || (
                        <span className="font-normal text-ink-faint">
                          Not selected
                        </span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-ink-muted">Where</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {[form.location.trim(), form.city.trim()]
                        .filter(Boolean)
                        .join(", ") || (
                        <span className="font-normal text-ink-faint">
                          Not set yet
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 border-t border-line-soft pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink-muted">Budget</span>
                    <span className="text-lg font-extrabold tabular-nums text-ink">
                      {hasBudget ? formatMoney(budgetValue) : "—"}
                    </span>
                  </div>

                  {hasBudget && (
                    <>
                      <div className="mt-2 flex items-baseline justify-between gap-3">
                        <span className="text-sm text-ink-muted">
                          Advance to confirm (10%)
                        </span>
                        <span className="font-bold tabular-nums text-brand">
                          {formatMoney(advanceFor(budgetValue))}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <span className="text-sm text-ink-muted">
                          Due on completion
                        </span>
                        <span className="font-semibold tabular-nums text-ink-body">
                          {formatMoney(remainingAfter(budgetValue))}
                        </span>
                      </div>
                    </>
                  )}

                  <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                    You only pay the advance once a worker accepts. The balance
                    is due when the task is marked complete.
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    iconLeft={!loading ? <SendIcon className="h-4 w-4" /> : null}
                  >
                    {loading ? "Posting..." : "Post Task"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </Button>
                </div>
              </Panel>
            </div>
          </aside>
        </div>
      </form>
    </PageShell>
  );
}
