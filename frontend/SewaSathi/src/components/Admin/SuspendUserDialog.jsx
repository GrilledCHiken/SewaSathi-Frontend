import { useRef, useState } from "react";
import Modal, { ModalBody, ModalFooter } from "../ui/Modal";
import { Button, CharCount, Field, Textarea } from "../ui";

const MAX_LENGTH = 500;

/**
 * Collects the message the account holder will receive before an admin suspends or restores
 * an account.
 *
 * One dialog for both directions: they differ only in copy and in whether the text is
 * required. Suspending demands a reason, since it is shown to the person on the login screen
 * and is all they have to act on. Restoring takes an optional note.
 */
export default function SuspendUserDialog({ user, submitting = false, onCancel, onConfirm }) {
  const [text, setText] = useState("");
  const [lastUserId, setLastUserId] = useState(null);
  const textareaRef = useRef(null);

  // Prop-derived state reset during render, so reopening on a different row never shows
  // what was typed for the previous person.
  if (user && user.id !== lastUserId) {
    setLastUserId(user.id);
    setText("");
  }

  if (!user) return null;

  const restoring = user.suspended;
  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_LENGTH;
  const blocked = submitting || tooLong || (!restoring && !trimmed);

  const submit = (event) => {
    event.preventDefault();
    if (blocked) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      open
      onClose={submitting ? undefined : onCancel}
      title={restoring ? `Restore ${user.fullName}?` : `Suspend ${user.fullName}?`}
      description={
        restoring
          ? "They will be able to sign in again straight away."
          : "They will be signed out of Sewa Sathi and cannot sign in until you restore them."
      }
      size="md"
      trapFocus
      lockScroll
      initialFocusRef={textareaRef}
    >
      <form onSubmit={submit}>
        <ModalBody>
          <Field
            label={restoring ? "Note (optional)" : "Reason for suspension"}
            required={!restoring}
            hint={
              restoring
                ? "Anything you add here is included in the email confirming their account is back."
                : "Emailed to the account holder word for word, and shown to them the next time they try to sign in. Write it for them, not as an internal note."
            }
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
                placeholder={
                  restoring
                    ? "e.g. Thanks for sending the updated document."
                    : "e.g. Repeated no-shows on confirmed bookings on 2 and 5 August."
                }
              />
            )}
          </Field>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={restoring ? "primary" : "danger"}
            loading={submitting}
            disabled={blocked}
          >
            {restoring ? "Restore account" : "Suspend account"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
