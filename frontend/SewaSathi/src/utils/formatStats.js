/**
 * Formatters for the live platform figures on the public pages.
 *
 * These pages used to carry invented totals — "50,000+ happy customers" on a
 * platform that had none. The numbers are real now, which means they are also
 * sometimes zero, and sometimes genuinely absent: an unreviewed platform has no
 * average rating, and that is not the same claim as a rating of zero.
 *
 * So every formatter here distinguishes the two. A real zero prints as "0"; a
 * missing value prints as an em dash. Neither is ever padded up to look busier.
 */

/** Shown in place of a figure that does not exist yet. */
export const NO_VALUE = "—";

const isMissing = (value) => value === null || value === undefined || Number.isNaN(value);

/** A whole number with thousands separators: 1234 → "1,234". */
export function formatCount(value) {
  if (isMissing(value)) return NO_VALUE;
  return Number(value).toLocaleString();
}

/** A rating to one decimal place: 4.6666 → "4.7". Null when nothing is rated. */
export function formatRating(value) {
  if (isMissing(value)) return NO_VALUE;
  return Number(value).toFixed(1);
}

/** A whole percent: 98 → "98%". */
export function formatPercent(value) {
  if (isMissing(value)) return NO_VALUE;
  return `${Math.round(Number(value))}%`;
}

/** Rupees, no decimals — matching how budgets read elsewhere in the app. */
export function formatRupees(value) {
  if (isMissing(value)) return NO_VALUE;
  return `Rs ${Math.round(Number(value)).toLocaleString()}`;
}

/**
 * A count with its noun, pluralised: (1, "review") → "1 review".
 * Used where a bare number would not say what it counted.
 */
export function formatCountLabel(value, singular, plural = `${singular}s`) {
  if (isMissing(value)) return NO_VALUE;
  const count = Number(value);
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}

/**
 * Joins names for prose: ["A","B","C"] → "A, B and C".
 * Caps the list so a platform operating in thirty cities does not print all
 * thirty mid-sentence.
 */
export function formatNameList(names, max = 4) {
  if (!Array.isArray(names) || names.length === 0) return "";
  const shown = names.slice(0, max);
  if (names.length > max) return `${shown.join(", ")} and more`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}
