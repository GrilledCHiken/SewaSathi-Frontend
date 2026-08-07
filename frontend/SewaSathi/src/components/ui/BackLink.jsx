import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../utils/cn";
import { ArrowLeftIcon } from "./icons";

/**
 * The one back affordance.
 *
 * Five auth screens had each hand-rolled the same <Link> + ArrowLeftIcon with a
 * byte-identical class string, and the screens that needed it most — Login, the
 * role chooser, every dashboard page — had nothing at all.
 *
 * `to` is the fallback, not the destination. When the user reached this screen
 * from inside the app there is a real previous entry, and popping it beats a
 * hardcoded guess: /help is linked from all three dashboard sidebars and should
 * return to whichever one the user came from. React Router marks the first entry
 * of a session with key "default", which is how a deep link or a fresh tab —
 * where there is nothing to pop — is told apart from ordinary navigation.
 */
export default function BackLink({
  to = "/",
  label = "Back",
  iconOnly = false,
  className,
}) {
  const navigate = useNavigate();
  const { key } = useLocation();

  const handleClick = () => (key !== "default" ? navigate(-1) : navigate(to));

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-field text-sm font-medium text-ink-faint transition hover:text-ink-body focus-ring",
        iconOnly ? "p-2 hover:bg-surface-sunken hover:text-ink" : "px-1 py-0.5",
        className,
      )}
    >
      <ArrowLeftIcon className={iconOnly ? "h-5 w-5" : "h-4 w-4"} />
      {!iconOnly && label}
    </button>
  );
}
