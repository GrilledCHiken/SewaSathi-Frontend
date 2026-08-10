import { useEffect, useState } from "react";
import DocumentViewerModal from "./DocumentViewerModal";

/**
 * Opens a worker's uploaded document in a viewer. The bytes come through the authenticated
 * /api/files endpoint rather than a plain link, and are shown in place so an admin can read
 * and decide without fishing the file out of their Downloads folder.
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

/**
 * One label/value row inside a details panel. Skipped entirely when empty.
 *
 * `empty` opts out of that: on your own profile a blank rate or bio has to keep its label,
 * otherwise the field you came to fill in is the one field you cannot see. An admin reading
 * someone else's record passes nothing and gets the original skip-when-empty behaviour.
 */
export function DetailField({ label, value, empty }) {
  if (value == null || value === "") {
    if (!empty) return null;

    return (
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
        <dd className="mt-0.5 text-sm italic text-ink-faint">{empty}</dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-body">{value}</dd>
    </div>
  );
}
