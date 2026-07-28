import { useEffect, useState } from "react";
import DocumentViewerModal from "../DocumentViewerModal";

/**
 * Opens a worker's uploaded document in a viewer. Identity documents are no longer publicly
 * readable, so the bytes come back through the authenticated /api/files endpoint rather than
 * a plain link — but an admin checking a worker needs to read the document and decide, not
 * fish it out of their Downloads folder first.
 *
 * `onOpenChange` lets a surrounding dialog stand down while the viewer is up, so Escape
 * closes the document rather than collapsing both at once.
 */
export function DocumentLink({ url, name, onOpenChange }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // A document left open when the link unmounts must not strand the parent's suppression.
  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-brand underline underline-offset-2 hover:text-brand-dark"
      >
        View {name}
      </button>
      {open && (
        <DocumentViewerModal storedUrl={url} title={name} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** One label/value row inside a details panel. Skipped entirely when empty. */
export function DetailField({ label, value }) {
  if (value == null || value === "") return null;

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{value}</dd>
    </div>
  );
}
