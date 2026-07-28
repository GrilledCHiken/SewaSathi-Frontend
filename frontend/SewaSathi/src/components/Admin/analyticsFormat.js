/**
 * Formatting and date helpers shared by the analytics widget on the dashboard and the full
 * Analytics page, so the two can never present the same figure differently.
 */

/** ISO date string for an input[type=date], n years before today. */
export function isoYearsAgo(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

/** ISO date string n days before today. `isoDaysAgo(0)` is today. */
export function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(amount) {
  return `NPR ${Number(amount ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

export function formatCount(value) {
  return Number(value ?? 0).toLocaleString();
}

/** Renders a yyyy-mm-dd from the API as a readable date. */
export function formatDate(iso) {
  if (!iso) return "";
  // Parsed as local midnight: `new Date("2026-07-28")` alone is UTC, which can show the
  // previous day west of Greenwich.
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date) {
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
