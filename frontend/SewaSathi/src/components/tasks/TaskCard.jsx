import { useId, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import {
  categoryMeta,
  formatDate,
  formatLocation,
  formatMoney,
  formatStatus,
  initialsOf,
  paletteFor,
  statusMeta,
} from "./taskUi";

const ACCENTS = {
  brand: {
    chevron: "hover:text-brand focus-visible:ring-brand/30",
    link: "text-brand hover:text-brand-dark",
  },
  emerald: {
    chevron: "hover:text-emerald-600 focus-visible:ring-emerald-500/30",
    link: "text-emerald-700 hover:text-emerald-800",
  },
};

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-body">{value}</dd>
    </div>
  );
}

function PartyLine({ party, createdAt }) {
  if (party?.person) {
    const palette = paletteFor(party.person.id);
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${palette.bg} ${palette.text}`}
        >
          {initialsOf(party.person.fullName)}
        </span>
        <span className="truncate font-medium text-ink-body">
          {party.person.fullName}
        </span>
      </span>
    );
  }

  if (party?.emptyLabel) {
    return (
      <span className="truncate text-xs italic text-ink-faint">
        {party.emptyLabel}
      </span>
    );
  }

  return (
    <span className="truncate text-xs text-ink-faint">
      Posted {formatDate(createdAt, "recently")}
    </span>
  );
}

/**
 * Compact task row. Collapsed it shows only what is needed to triage a task;
 * the chevron expands the same card in place to reveal the description,
 * dates and contact details.
 */
export default function TaskCard({
  task,
  accent = "brand",
  party = null,
  actions = null,
  extraDetails = [],
  showStatus = true,
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const tone = ACCENTS[accent] || ACCENTS.brand;
  const category = categoryMeta(task.category);
  const status = formatStatus(task.status);
  const location = formatLocation(task);
  const due = task.dueDate ? formatDate(task.dueDate) : "Flexible";

  return (
    <article className="relative overflow-hidden rounded-card border border-line bg-surface pl-1 shadow-e1 transition duration-200 ease-out-soft hover:border-line-strong hover:shadow-e2">
      {/* Status accent on the left edge. Driven by the status rather than the
          panel's accent prop, so it reads the same in the worker panel. */}
      <span
        className={`absolute inset-y-0 left-0 w-1 ${statusMeta(status).stripe}`}
        aria-hidden="true"
      />

      <div
        className="flex cursor-pointer items-start gap-3 p-3.5 sm:gap-4 sm:p-4"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.tile}`}
        >
          {category.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-ink sm:text-base">
                {task.title}
              </h3>
              {showStatus && <StatusBadge status={status} />}
            </div>
            <p className="shrink-0 text-sm font-bold text-ink sm:text-base">
              {formatMoney(task.budget)}
            </p>
          </div>

          <p className="mt-1 truncate text-xs text-ink-muted sm:text-sm">
            {[task.category, location, `Due ${due}`].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <PartyLine party={party} createdAt={task.createdAt} />

            <div className="flex shrink-0 items-center gap-2">
              {actions && (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((prev) => !prev);
                }}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? "Hide task details" : "Show task details"}
                className={`rounded-lg p-1.5 text-ink-faint transition hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 ${tone.chevron}`}
              >
                <ChevronIcon open={open} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div
            id={panelId}
            className="border-t border-line-soft bg-surface-muted px-4 py-4 sm:pl-[4.5rem]"
          >
            {task.description && (
              <p className="text-sm leading-relaxed text-ink-muted">
                {task.description}
              </p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <DetailItem label="Posted" value={formatDate(task.createdAt, "")} />
              <DetailItem label="Due" value={due} />
              <DetailItem label="Preferred time" value={task.timePreference} />
              <DetailItem label="Budget" value={formatMoney(task.budget)} />
              {extraDetails.map((item) => (
                <DetailItem key={item.label} label={item.label} value={item.value} />
              ))}
            </dl>

            {party?.person && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    paletteFor(party.person.id).bg
                  } ${paletteFor(party.person.id).text}`}
                >
                  {initialsOf(party.person.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {party.person.fullName}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {[party.role, party.person.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {party.messageHref ? (
                  <Link
                    to={party.messageHref}
                    className={`shrink-0 text-sm font-semibold transition ${tone.link}`}
                  >
                    Message
                  </Link>
                ) : (
                  // Chat is locked until the advance is paid. Keeping the control in
                  // place, greyed out, explains the rule where it applies.
                  party.messageLockedHint && (
                    <span
                      className="shrink-0 cursor-not-allowed text-sm font-semibold text-ink-faint"
                      title={party.messageLockedHint}
                      aria-disabled="true"
                    >
                      Message
                    </span>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
