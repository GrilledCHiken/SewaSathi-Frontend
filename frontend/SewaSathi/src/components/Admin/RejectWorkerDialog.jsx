import { useRef, useState } from "react";
import Modal, { ModalBody, ModalFooter } from "../ui/Modal";
import { Button, CharCount, Field, Textarea } from "../ui";

const MAX_LENGTH = 500;

/**
 * Collects the reason an applicant will be given before an admin turns their worker
 * application down.
 *
 * The reason is required for the same purpose the suspension one is (see SuspendUserDialog):
 * it is emailed to them word for word and shown in the banner they get at their next sign-in,
 * so rejecting without one would leave them shut out with nothing to act on. Approving needs
 * no dialog — there is nothing to explain.
 */
export default function RejectWorkerDialog({ worker, submitting = false, onCancel, onConfirm }) {
  const [text, setText] = useState("");
  const [lastWorkerId, setLastWorkerId] = useState(null);
  const textareaRef = useRef(null);

  // Prop-derived state reset during render, matching SuspendUserDialog, so reopening on a
  // different applicant never shows what was typed for the previous one.
  if (worker && worker.id !== lastWorkerId) {
    setLastWorkerId(worker.id);
    setText("");
  }

  if (!worker) return null;

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_LENGTH;
  const blocked = submitting || tooLong || !trimmed;

  const submit = (event) => {
    event.preventDefault();
    if (blocked) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      open
      onClose={submitting ? undefined : onCancel}
      title={`Reject ${worker.fullName}?`}
      description="Their account stays, but they cannot take work until an admin approves them."
      size="md"
      trapFocus
      lockScroll
      initialFocusRef={textareaRef}
    >
      <form onSubmit={submit}>
        <ModalBody>
          <Field
            label="Reason for rejection"
            required
            hint="Emailed to the applicant word for word, and shown to them when they sign in. Write it for them, not as an internal note."
            error={tooLong ? `Keep this to ${MAX_LENGTH} characters or fewer.` : undefined}
            labelSuffix={<CharCount value={text} max={MAX_LENGTH} />}
          >
            {(field) => (
              <Textarea
                {...field}
                ref={textareaRef}
                rows={4}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="e.g. The police clearance report is unreadable — please send a clearer scan of the whole page."
              />
            )}
          </Field>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={submitting} disabled={blocked}>
            Reject application
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
