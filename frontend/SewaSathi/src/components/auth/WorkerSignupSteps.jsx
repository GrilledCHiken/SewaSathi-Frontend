import { cn } from "../../utils/cn";
import { CheckIcon } from "../ui/icons";

/**
 * Progress header for the two-screen worker signup: account details, then
 * verification.
 *
 * Worth having because the two screens are different shapes — the account form
 * sits in AuthLayout's narrow card, the verification form in its own wide one —
 * and without a shared marker the second screen reads as an unrelated wall of
 * uploads rather than the rest of signing up.
 */

const STEPS = ["Account", "Verification"];

function StepDot({ index, current }) {
  const done = index < current;
  const active = index === current;

  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
        done && "bg-brand text-white",
        active && "bg-brand text-white ring-4 ring-brand/15",
        !done && !active && "border border-line bg-surface text-ink-faint",
      )}
    >
      {done ? <CheckIcon className="h-3.5 w-3.5" /> : index}
    </span>
  );
}

export default function WorkerSignupSteps({ current = 1, className = "" }) {
  return (
    <div className={cn(className)}>
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Step {current} of {STEPS.length}
      </p>

      <ol className="flex items-center gap-3">
        {STEPS.map((label, i) => {
          const index = i + 1;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2.5",
                // The connector before every step but the first. It fills the gap
                // between the two dots, so it owns the row's spare width.
                i > 0 && "min-w-0 flex-1",
              )}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition",
                    index <= current ? "bg-brand" : "bg-line",
                  )}
                />
              )}
              <StepDot index={index} current={current} />
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-semibold",
                  index <= current ? "text-ink" : "text-ink-faint",
                )}
                aria-current={index === current ? "step" : undefined}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
