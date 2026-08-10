import { cn } from "../../utils/cn";
import { toneOf } from "./tones";
import {
  AlertIcon,
  CheckCircleIcon,
  InfoIcon,
} from "./icons";

/**
 * Inline message block — advance-payment notices, "account created", sandbox
 * warnings, load failures with a retry.
 *
 * Toasts stay for transient mutation feedback; this is for state that belongs on the page.
 *
 * `role` is a pass-through and deliberately not defaulted. An alert rendered on mount is
 * just content; one that appears in response to a user action wants `role="status"`.
 * Defaulting to `alert` would make every static notice shout on page load.
 */

const DEFAULT_ICONS = Object.freeze({
  success: CheckCircleIcon,
  warning: AlertIcon,
  danger: AlertIcon,
  info: InfoIcon,
  brand: InfoIcon,
  neutral: InfoIcon,
});

export default function Alert({
  tone = "info",
  title,
  icon,
  action,
  onDismiss,
  className = "",
  children,
  ...rest
}) {
  const t = toneOf(tone);
  const DefaultIcon = DEFAULT_ICONS[tone] || InfoIcon;
  const showIcon = icon !== false;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-card border p-4",
        t.soft,
        t.border,
        className,
      )}
      {...rest}
    >
      {showIcon && (
        <span className="mt-0.5 shrink-0">
          {icon || <DefaultIcon className="h-5 w-5" />}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-bold">{title}</p>}
        {children && (
          <div
            className={cn(
              "text-sm leading-relaxed",
              title && "mt-1 opacity-90",
            )}
          >
            {children}
          </div>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 shrink-0 rounded-field p-1.5 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-ring"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
