/**
 * The shared tone vocabulary for Badge, Alert, StatTile and Meter.
 *
 * Before this, each surface picked its own pastel pair straight from the stock
 * Tailwind palette (`bg-emerald-100 text-emerald-700` here, `bg-emerald-50
 * text-emerald-600` there), so the same semantic meaning rendered at two
 * different weights depending on which component you happened to be looking at.
 * These map onto the semantic tokens in index.css instead.
 *
 * Full literal class strings, never interpolated — Tailwind's JIT scans source
 * text and would compile `bg-${tone}-soft` to nothing.
 */

export const TONES = Object.freeze({
  brand: {
    soft: "bg-brand-50 text-brand-700",
    solid: "bg-brand text-white",
    dot: "bg-brand",
    tile: "bg-brand-50 text-brand-600",
    border: "border-brand-200",
    bar: "bg-brand",
  },
  success: {
    soft: "bg-success-soft text-success-ink",
    solid: "bg-success text-white",
    dot: "bg-success",
    tile: "bg-success-soft text-success",
    border: "border-success/25",
    bar: "bg-success",
  },
  warning: {
    soft: "bg-warning-soft text-warning-ink",
    solid: "bg-warning text-white",
    dot: "bg-warning",
    tile: "bg-warning-soft text-warning",
    border: "border-warning/30",
    bar: "bg-warning",
  },
  danger: {
    soft: "bg-danger-soft text-danger-ink",
    solid: "bg-danger text-white",
    dot: "bg-danger",
    tile: "bg-danger-soft text-danger",
    border: "border-danger/25",
    bar: "bg-danger",
  },
  info: {
    soft: "bg-info-soft text-info-ink",
    solid: "bg-info text-white",
    dot: "bg-info",
    tile: "bg-info-soft text-info",
    border: "border-info/25",
    bar: "bg-info",
  },
  accent: {
    soft: "bg-accent-soft text-accent-ink",
    solid: "bg-accent text-white",
    dot: "bg-accent",
    tile: "bg-accent-soft text-accent",
    border: "border-accent/25",
    bar: "bg-accent",
  },
  neutral: {
    soft: "bg-neutral-soft text-neutral-ink",
    solid: "bg-ink text-white",
    dot: "bg-ink-faint",
    tile: "bg-surface-sunken text-ink-muted",
    border: "border-line",
    bar: "bg-ink-faint",
  },
});

export function toneOf(tone) {
  return TONES[tone] || TONES.neutral;
}
