import { useId } from "react";
import { cn } from "../../utils/cn";

/**
 * Form primitives — wrappers, not a form library. The consumer still owns `value`, `onChange`,
 * `name` and validation. What these own is the wiring: the label/control `id` link,
 * `aria-invalid`, and `aria-describedby` pointing at both the hint and the error.
 *
 * The `aria-[invalid=true]:` variants on INPUT_BASE derive error styling from the ARIA
 * attribute, so a field cannot render a red border while reporting itself valid.
 */

export const INPUT_BASE =
  "w-full rounded-field border border-line bg-surface text-ink shadow-e1 " +
  "placeholder:text-ink-faint transition duration-200 ease-out-soft " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "aria-[invalid=true]:border-danger/60 aria-[invalid=true]:focus:border-danger " +
  "aria-[invalid=true]:focus:ring-danger/20 " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-faint";

const CONTROL_PAD = "px-4 py-3";

/**
 * Label + hint + control + error message.
 *
 * Children may be a render prop, which receives the `id` and ARIA attributes to
 * spread onto the control:
 *
 *   <Field label="Email" error={errors.email}>
 *     {(field) => <Input {...field} value={email} onChange={…} />}
 *   </Field>
 *
 * Passing plain children works too when the control wires itself up.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  labelSuffix,
  className = "",
  children,
}) {
  // Hooks must run before any early return, so this is unconditional even when
  // the caller supplies its own id.
  const generatedId = useId();
  const fieldId = id || generatedId;

  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = cn(hintId, errorId) || undefined;

  const fieldProps = {
    id: fieldId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor={fieldId}
            className="block text-sm font-semibold text-ink"
          >
            {label}
            {required && (
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {labelSuffix}
        </div>
      )}

      {hint && (
        <p id={hintId} className="mb-1.5 text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      )}

      {typeof children === "function" ? children(fieldProps) : children}

      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Text input with optional leading icon and trailing slot (password reveal,
 * unit suffix). The icon is positioned absolutely and the input padded around
 * it, so the text never sits under the glyph.
 */
export function Input({
  leadingIcon,
  trailing,
  className = "",
  inputClassName = "",
  ...rest
}) {
  return (
    <div className={cn("relative", className)}>
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center text-ink-faint">
          {leadingIcon}
        </span>
      )}

      <input
        className={cn(
          INPUT_BASE,
          CONTROL_PAD,
          leadingIcon && "pl-11",
          trailing && "pr-11",
          inputClassName,
        )}
        {...rest}
      />

      {trailing && (
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
          {trailing}
        </span>
      )}
    </div>
  );
}

export function Textarea({ className = "", rows = 5, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cn(INPUT_BASE, CONTROL_PAD, "resize-y", className)}
      {...rest}
    />
  );
}

/**
 * Native select with a custom chevron. `appearance-none` removes the platform
 * arrow; the chevron is drawn as a background image so it cannot be clicked
 * separately from the control.
 */
export function Select({ className = "", children, ...rest }) {
  return (
    <div className="relative">
      <select
        className={cn(
          INPUT_BASE,
          CONTROL_PAD,
          "cursor-pointer appearance-none pr-10",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Live character counter for length-capped textareas. Announced politely, not assertively — a
 * count interrupting on every keystroke would make the field unusable with a screen reader.
 */
export function CharCount({ value = "", max, className = "" }) {
  const used = value.length;
  const nearLimit = used > max * 0.9;
  const over = used > max;

  return (
    <span
      aria-live="polite"
      className={cn(
        "text-xs font-medium tabular-nums",
        over ? "text-danger" : nearLimit ? "text-warning-ink" : "text-ink-faint",
        className,
      )}
    >
      {used}/{max}
    </span>
  );
}

export default Field;
