import { ADVANCE_PERCENT_LABEL, formatMoney } from "../tasks/taskUi.jsx";
import Button from "../ui/Button";

const MAX_VISIBLE_SKILLS = 3;

const HIRE_FIRST_HINT =
  `Messaging opens after you hire this worker and pay the ${ADVANCE_PERCENT_LABEL} advance.`;

function VerifiedBadge() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <title>Verified worker</title>
      <path d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

/**
 * Worker tile for the Browse Workers grid.
 *
 * Every region below is height-locked (avatar row `h-12`, bio `h-10`, skills
 * `h-7`) and the actions are pushed down with `mt-auto`, so all cards render at
 * an identical height no matter how long a bio is or how many skills a worker
 * lists. Do not swap a fixed height for a min-height here — that is what made
 * the grid ragged before.
 *
 * The bio's `h-10` is exactly two lines of `text-sm leading-5`. If you ever
 * change that type scale, recompute all three fixed heights rather than
 * adjusting them by eye.
 */
export default function WorkerCard({ worker, onHire }) {
  const visibleSkills = worker.skills.slice(0, MAX_VISIBLE_SKILLS);
  const overflowCount = worker.skills.length - visibleSkills.length;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface p-5 shadow-e1 transition duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-e2 motion-reduce:hover:translate-y-0">
      {/* Hairline that warms on hover. Absolutely positioned, so it sits
          outside the height-locked flow and cannot affect card height. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand via-cyan-400 to-brand opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      />
      {/* Identity */}
      <div className="flex h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${worker.avatarBg} ${worker.avatarText}`}
          >
            {worker.initials}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate font-bold leading-tight text-ink">
                {worker.name}
              </h3>
              <VerifiedBadge />
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{worker.location}</span>
            </p>
          </div>
        </div>

        <p className="shrink-0 text-right text-sm font-bold leading-tight text-emerald-600">
          {formatMoney(worker.rate)}
          <span className="mt-0.5 block text-xs font-medium text-ink-muted">
            per hour
          </span>
        </p>
      </div>

      {/* Stats — locked to a single line so it can never reflow the card */}
      <div className="mt-4 flex items-center gap-2 truncate whitespace-nowrap text-xs text-ink-muted">
        <span className="inline-flex shrink-0 items-center gap-1">
          <svg
            className="h-3.5 w-3.5 text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-semibold text-ink-body">{worker.rating}</span>
          <span>({worker.reviews})</span>
        </span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{worker.tasksDone} tasks done</span>
      </div>

      {/* Bio — exactly two lines (h-10 = 2 x leading-5) */}
      <p className="mt-3 line-clamp-2 h-10 text-sm leading-5 text-ink-muted">
        {worker.description}
      </p>

      {/* Skills — one row, overflow rolled into a +N chip. `min-w-0` on each
          chip lets a long skill name shrink and ellipsise rather than get
          clipped by the row's overflow-hidden. */}
      <div className="mt-4 flex h-7 items-center gap-1.5 overflow-hidden">
        {visibleSkills.map((skill) => (
          <span
            key={skill}
            className="min-w-0 truncate whitespace-nowrap rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-muted"
          >
            {skill}
          </span>
        ))}
        {overflowCount > 0 && (
          <span
            className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-muted"
            title={worker.skills.slice(MAX_VISIBLE_SKILLS).join(", ")}
          >
            +{overflowCount}
          </span>
        )}
        {worker.skills.length === 0 && (
          <span className="text-xs text-ink-faint">No skills listed</span>
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-5">
        <Button size="sm" fullWidth onClick={() => onHire(worker)}>
          Hire Now
        </Button>
        {/* There is no thread to open yet: chat starts once this worker has been hired
            and the advance is paid. Shown disabled so the path is at least legible. */}
        <span title={HIRE_FIRST_HINT} className="inline-flex w-full">
          <Button size="sm" variant="secondary" fullWidth disabled>
            Message
          </Button>
        </span>
      </div>
    </article>
  );
}
