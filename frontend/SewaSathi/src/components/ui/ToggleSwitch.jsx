import { cn } from "../../utils/cn";

/**
 * On/off switch, as used for the desktop-notification permission in
 * AccountSecurity.
 *
 * A native <button role="switch"> rather than a styled checkbox: it announces
 * as a switch, responds to Space and Enter for free, and needs no hidden input
 * to keep in sync.
 *
 * `label` is required — an icon-only switch gives a screen reader nothing to
 * announce. Pass `labelHidden` when the surrounding row already carries visible
 * text, and the label becomes the accessible name only.
 */
export default function ToggleSwitch({
  checked = false,
  onChange,
  label,
  labelHidden = false,
  description,
  disabled = false,
  className = "",
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={labelHidden ? label : undefined}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full",
          "transition-colors duration-200 ease-out-soft focus-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-e1",
            "transition-transform duration-200 ease-out-soft",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
          aria-hidden="true"
        />
      </button>

      {!labelHidden && (label || description) && (
        <div className="min-w-0">
          {label && (
            <p className="text-sm font-semibold text-ink">{label}</p>
          )}
          {description && (
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
