import { cn } from "../../utils/cn";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "./button.variants";
import Spinner from "./Spinner";

/**
 * The app's only button.
 *
 * `as` renders the same styling as something else without redeclaring it —
 * `<Button as={Link} to="/dashboard/post-task">` for navigation, `as="a"` for
 * external links. Only a real `<button>` gets `type` and `disabled`, since
 * those are invalid on an anchor.
 *
 * `className` is for layout only (margin, width, grid placement). Anything
 * visual has a prop; see the note in utils/cn.js for why.
 */
export default function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  shape = "pill",
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  className = "",
  children,
  ...rest
}) {
  const isNativeButton = Comp === "button";

  return (
    <Comp
      {...(isNativeButton
        ? { type: rest.type ?? "button", disabled: disabled || loading }
        : {})}
      aria-busy={loading || undefined}
      // A link cannot be `disabled`; mark it for assistive tech instead.
      aria-disabled={!isNativeButton && (disabled || loading) ? true : undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold",
        "transition duration-200 ease-out-soft focus-ring",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        "aria-disabled:pointer-events-none aria-disabled:opacity-60",
        shape === "pill" ? "rounded-full" : "rounded-field",
        fullWidth && "w-full",
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </Comp>
  );
}
