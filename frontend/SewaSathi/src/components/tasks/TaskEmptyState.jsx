/**
 * Kept as a re-export so the existing call sites on the customer and worker
 * task surfaces don't have to move. The component was always generic despite
 * the name — it now lives in ui/EmptyState.jsx with the rest of the primitives.
 */
export { default } from "../ui/EmptyState";
