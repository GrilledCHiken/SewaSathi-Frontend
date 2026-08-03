import { cn } from "../../utils/cn";

/**
 * File picker styled as a dropzone.
 *
 * Not a `Field`: the control is the label itself, so the label/`htmlFor`
 * wiring `Field` exists to own doesn't apply. The error message below mirrors
 * `Field`'s so the two read identically in a column.
 *
 * Lives here rather than beside the worker verification form because the same
 * control collects a police clearance renewal on My Profile.
 */

function UploadIcon() {
  return (
    <svg className="h-6 w-6 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v12" />
    </svg>
  );
}

const DROPZONE_BASE =
  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-field border-2 border-dashed " +
  "bg-surface-sunken/60 px-4 text-center transition hover:border-brand hover:bg-brand-50/50 " +
  "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20";

export default function FileDropzone({
  id,
  label,
  required,
  file,
  error,
  onChange,
  accept = "application/pdf,image/*",
  icon = <UploadIcon />,
  placeholder = "Click to upload PDF or image",
  disabled = false,
  className = "",
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="min-w-0">
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}

      <label
        className={cn(
          DROPZONE_BASE,
          error ? "border-danger/60" : "border-line",
          disabled && "pointer-events-none opacity-60",
          className || "py-6",
        )}
      >
        {icon}
        <span
          className={cn(
            "text-xs font-medium",
            file ? "text-ink-body" : "text-ink-muted",
          )}
        >
          {file ? file.name : placeholder}
        </span>
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>

      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
