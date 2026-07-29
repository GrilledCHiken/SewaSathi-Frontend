/**
 * Joins class values. Falsy entries drop out; arrays and plain objects
 * (`{ "text-red-600": hasError }`) are flattened.
 *
 * Deliberately NOT `clsx` + `tailwind-merge`. This project ships zero runtime
 * UI dependencies, and tailwind-merge cannot read a Tailwind v4 CSS-first
 * `@theme` — keeping it correct would mean hand-maintaining an
 * `extendTailwindMerge` config mirroring index.css, which is exactly the kind
 * of duplication the ui/ layer exists to remove.
 *
 * Because there is no conflict resolution, the contract is:
 * **consumers add, they don't override.** Every primitive exposes props
 * (`variant`, `size`, `tone`, `shape`, `padding`) for anything that would
 * otherwise need overriding, and `className` is reserved for additive layout
 * concerns — margin, width, grid placement, order. If a consumer finds itself
 * needing to override a primitive's padding or colour via className, that's a
 * missing prop on the primitive, not a call site to work around.
 */
export function cn(...parts) {
  const out = [];

  for (const part of parts) {
    if (!part) continue;

    if (typeof part === "string") {
      out.push(part);
    } else if (Array.isArray(part)) {
      const nested = cn(...part);
      if (nested) out.push(nested);
    } else if (typeof part === "object") {
      for (const key in part) {
        if (part[key]) out.push(key);
      }
    }
  }

  return out.join(" ");
}

export default cn;
