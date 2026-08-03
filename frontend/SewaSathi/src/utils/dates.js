/**
 * Date helpers for the profile screens.
 *
 * Several pages had grown their own `formatDate(iso)`; the profile work needed a third and a
 * "how long until this expires" alongside it, so both live here instead.
 */

/** "12 Jun 2026". Empty string for a missing date, so it can be dropped into JSX directly. */
export function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "June 2026" — for "member since", where the day is noise. */
export function formatMonthYear(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Whole days from now until `iso`, negative once it is in the past.
 *
 * Rounded up, so a deadline eighteen hours away reads as "1 day left" rather than "0".
 * Null when there is no date to count towards.
 */
export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}
