import { useEffect, useRef, useState } from "react";
import Button from "../ui/Button";

const SAVE_VARIANTS = {
  brand: "primary",
  emerald: "emerald",
};

/**
 * A profile card that reads before it writes: it shows the values, and editing them is a
 * deliberate act — Edit, then Save or Cancel.
 *
 * `onOpen` and `onCancel` exist because the form state lives with the consumer, which owns
 * the validation and the API call; this only owns the toggle and says when to reseed.
 *
 * `onSave` resolves to `false` when validation failed, keeping the card open so the errors
 * stay visible. Omit `onSave` for a card whose controls save on their own — the photo card
 * uploads the moment a file is picked — and the footer becomes a single Done button.
 */
export default function EditableCard({
  title,
  description,
  accent = "brand",
  view,
  children,
  onOpen,
  onCancel,
  onSave,
  saving = false,
  editLabel = "Edit",
  saveLabel = "Save changes",
}) {
  const [editing, setEditing] = useState(false);
  const bodyRef = useRef(null);

  // Clicking Edit should land the caret in the form, not leave it on a button that just
  // disappeared.
  useEffect(() => {
    if (!editing) return;
    bodyRef.current
      // The photo card's file input is hidden behind a button, so it is not a focus target.
      ?.querySelector("input:not([type=file]):not([disabled]), select, textarea, button")
      ?.focus();
  }, [editing]);

  const handleEdit = () => {
    onOpen?.();
    setEditing(true);
  };

  const handleCancel = () => {
    onCancel?.();
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await onSave()) setEditing(false);
  };

  const body = (
    <div ref={bodyRef} className="mt-5">
      {editing ? children : view}
    </div>
  );

  const footer = onSave ? (
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line-soft pt-5">
      <Button variant="secondary" onClick={handleCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" variant={SAVE_VARIANTS[accent] ?? SAVE_VARIANTS.brand} loading={saving}>
        {saveLabel}
      </Button>
    </div>
  ) : (
    <div className="mt-6 flex justify-end border-t border-line-soft pt-5">
      <Button variant="secondary" onClick={handleCancel} disabled={saving}>
        Done
      </Button>
    </div>
  );

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-e1 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
          )}
        </div>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            // The visible label is part of the accessible name, so a voice command reading
            // the button ("Change password") still matches what is announced.
            aria-label={`${editLabel}: ${title}`}
            className="shrink-0"
          >
            {editLabel}
          </Button>
        )}
      </div>

      {editing ? (
        onSave ? (
          <form onSubmit={handleSubmit}>
            {body}
            {footer}
          </form>
        ) : (
          <>
            {body}
            {footer}
          </>
        )
      ) : (
        body
      )}
    </section>
  );
}
