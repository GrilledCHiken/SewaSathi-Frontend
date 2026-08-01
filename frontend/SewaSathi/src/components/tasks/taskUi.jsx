/**
 * Shared presentation tokens and formatters for every task surface
 * (customer My Tasks, worker My Jobs, worker Browse Tasks).
 */

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `badge` and `dot` are the original raw class pairs, kept so the existing
 * StatusBadge and the worker task surfaces render unchanged.
 *
 * `tone` and `pulse` are the same information expressed against the semantic
 * tone vocabulary in ui/tones.js, for surfaces built on the <Badge> primitive.
 * `stripe` is the left-edge accent on TaskCard. All of these describe one
 * status; they must not be allowed to disagree, so change them together.
 *
 * Class strings are written out in full — Tailwind's JIT scans source text, so
 * anything assembled at runtime would compile to nothing.
 */
export const STATUS_META = {
  open: {
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    tone: "neutral",
    stripe: "bg-slate-300",
  },
  // The customer hired a named worker directly and is waiting on their answer.
  // Amber rather than the violet `accepted` uses, because those two are the pair a
  // customer has to tell apart at a glance: only one of them has a Pay button.
  requested: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500 animate-pulse",
    tone: "warning",
    pulse: true,
    stripe: "bg-warning",
  },
  // A worker has said yes but the customer still owes the confirmation advance.
  accepted: {
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500 animate-pulse",
    tone: "accent",
    pulse: true,
    stripe: "bg-accent",
  },
  assigned: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    tone: "warning",
    stripe: "bg-warning",
  },
  "in progress": {
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500 animate-pulse",
    tone: "info",
    pulse: true,
    stripe: "bg-info",
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    tone: "success",
    stripe: "bg-success",
  },
  cancelled: {
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    tone: "danger",
    stripe: "bg-danger",
  },
};

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.open;
}

/* -------------------------------------------------------------------------- */
/* Category icons — hand-inlined SVG, no icon dependency                       */
/* -------------------------------------------------------------------------- */

const svg = (children) => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const FALLBACK_CATEGORY = {
  tile: "bg-slate-100 text-slate-500",
  icon: svg(
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </>,
  ),
};

export const CATEGORY_META = {
  "Furniture Assembly": {
    tile: "bg-amber-50 text-amber-600",
    icon: svg(
      <>
        <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
        <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0" />
        <path d="M4 18v2M20 18v2" />
      </>,
    ),
  },
  Mounting: {
    tile: "bg-violet-50 text-violet-600",
    icon: svg(
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>,
    ),
  },
  Cleaning: {
    tile: "bg-sky-50 text-sky-600",
    icon: svg(
      <>
        <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        <path d="M18 15.5 18.7 17.3 20.5 18l-1.8.7L18 20.5l-.7-1.8L15.5 18l1.8-.7z" />
        <path d="M5.5 14 6 15.5 7.5 16 6 16.5 5.5 18 5 16.5 3.5 16 5 15.5z" />
      </>,
    ),
  },
  "Moving Help": {
    tile: "bg-emerald-50 text-emerald-600",
    icon: svg(
      <>
        <path d="M10 17h4V5H2v12h3" />
        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </>,
    ),
  },
  Gardening: {
    tile: "bg-emerald-50 text-emerald-600",
    icon: svg(
      <>
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8Z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z" />
      </>,
    ),
  },
  "Delivery Help": {
    tile: "bg-amber-50 text-amber-600",
    icon: svg(
      <>
        <path d="m7.5 4.3 9 5.1" />
        <path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="M3.3 7 12 12l8.7-5M12 22V12" />
      </>,
    ),
  },
  Painting: {
    tile: "bg-rose-50 text-rose-600",
    icon: svg(
      <>
        <rect x="2" y="2" width="16" height="6" rx="2" />
        <path d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="8" y="16" width="4" height="6" rx="1" />
      </>,
    ),
  },
  Electrician: {
    tile: "bg-amber-50 text-amber-600",
    icon: svg(<path d="M13 2 4.5 13.5H11l-.5 8.5L19 10.5h-6.5z" />),
  },
  Plumbing: {
    tile: "bg-sky-50 text-sky-600",
    icon: svg(
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
    ),
  },
  "Outdoor Help": {
    tile: "bg-amber-50 text-amber-600",
    icon: svg(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
      </>,
    ),
  },
  "Heavy Lifting": {
    tile: "bg-slate-100 text-slate-600",
    icon: svg(
      <>
        <path d="M6 12h12" />
        <rect x="2" y="9" width="4" height="6" rx="1" />
        <rect x="18" y="9" width="4" height="6" rx="1" />
      </>,
    ),
  },
  "Home Repair": {
    tile: "bg-slate-100 text-slate-600",
    icon: svg(
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-8 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-8l-3.7 3.8z" />,
    ),
  },
  "Office Support": {
    tile: "bg-violet-50 text-violet-600",
    icon: svg(
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>,
    ),
  },
  Other: FALLBACK_CATEGORY,
};

export function categoryMeta(category) {
  return CATEGORY_META[category] || FALLBACK_CATEGORY;
}

/* -------------------------------------------------------------------------- */
/* Avatars                                                                     */
/* -------------------------------------------------------------------------- */

export const AVATAR_PALETTE = [
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
];

export function paletteFor(id) {
  return AVATAR_PALETTE[Math.abs(Number(id) || 0) % AVATAR_PALETTE.length];
}

export function initialsOf(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Formatters                                                                  */
/* -------------------------------------------------------------------------- */

export function formatStatus(status) {
  return (status || "").replace(/_/g, " ").toLowerCase();
}

export function formatMoney(amount) {
  if (amount == null) return "";
  return `NPR ${Number(amount).toLocaleString()}`;
}

/**
 * Share of the budget a customer pays up front to confirm a booking. Kept in step
 * with `app.esewa.advance-rate` on the backend, which is the authoritative figure —
 * this is only for what we show before checkout.
 */
export const ADVANCE_RATE = 0.1;

export function advanceFor(budget) {
  if (budget == null) return 0;
  return Math.round(Number(budget) * ADVANCE_RATE * 100) / 100;
}

export function remainingAfter(budget) {
  if (budget == null) return 0;
  return Math.round((Number(budget) - advanceFor(budget)) * 100) / 100;
}

export const ADVANCE_PERCENT_LABEL = `${Math.round(ADVANCE_RATE * 100)}%`;

/**
 * Chat is a paid feature: the backend only opens a thread once the advance has settled
 * on a task the two people share. Nothing in a task listing says whether a payment went
 * through, but only a settled advance moves a task past `accepted` — so these statuses
 * stand in for it when deciding whether to enable a Message control. The Messages page
 * itself is driven by the server, which remains the authority.
 */
const CHAT_OPEN_STATUSES = new Set(["assigned", "in progress", "completed"]);

export function chatUnlocked(task) {
  return CHAT_OPEN_STATUSES.has(formatStatus(task?.status));
}

export const CHAT_LOCKED_HINT = `Messaging opens once the ${ADVANCE_PERCENT_LABEL} advance is paid.`;

export function formatDate(iso, fallback = "Flexible") {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLocation(task) {
  return [task.location, task.city].filter(Boolean).join(", ");
}

/* -------------------------------------------------------------------------- */
/* Empty-state icons                                                           */
/* -------------------------------------------------------------------------- */

const emptyIcon = (children) => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const INBOX_ICON = emptyIcon(
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </>,
);

export const SEARCH_ICON = emptyIcon(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

export const CHECK_ICON = emptyIcon(
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4 12 14.01l-3-3" />
  </>,
);
