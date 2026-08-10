/**
 * Button variant and size class maps. Kept in a `.js` sibling so Button.jsx exports
 * components only, satisfying react-refresh/only-export-components.
 *
 * Every entry is a complete literal class string: Tailwind's JIT scans source text, so a
 * fragment like `bg-${tone}-100` would compile to nothing.
 */

export const BUTTON_SIZES = Object.freeze({
  xs: "h-8 gap-1.5 px-3 text-xs",
  sm: "h-9 gap-1.5 px-3.5 text-xs",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-7 text-base",
});

export const BUTTON_VARIANTS = Object.freeze({
  /** Default call to action. */
  primary: "bg-brand text-white shadow-brand hover:bg-brand-dark",

  /** Neutral action sitting beside a primary one. */
  secondary:
    "border border-line bg-surface text-ink shadow-e1 hover:border-brand/40 hover:bg-brand-50/60 hover:text-brand-700",

  /** Low-emphasis action inside dense chrome (headers, card corners). */
  ghost: "text-ink-body hover:bg-surface-sunken hover:text-ink",

  /** Destructive: cancel a task, sign out everywhere, delete. */
  danger: "bg-danger text-white shadow-e1 hover:bg-danger-ink",

  /** Quiet inline link — the "View All →" affordance. */
  quiet: "text-brand hover:bg-brand-50 hover:text-brand-dark",

  /** Worker-panel accent, matching AVATAR_BY_ROLE's emerald. */
  emerald: "bg-emerald-600 text-white shadow-e1 hover:bg-emerald-700",

  /** On a brand-gradient band: inverted fill. */
  onBrand: "bg-white text-brand hover:bg-brand-50",

  /** On a brand-gradient band: glass outline beside `onBrand`. */
  outlineOnBrand:
    "border border-white/40 bg-white/15 text-white backdrop-blur hover:bg-white/25",

  /** On the navy sidebar rail. */
  onDark: "bg-white/10 text-white hover:bg-white/20",
});
