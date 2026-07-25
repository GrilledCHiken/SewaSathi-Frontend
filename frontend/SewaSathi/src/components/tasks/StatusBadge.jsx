import { statusMeta } from "./taskUi";

export default function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}
