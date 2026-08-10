import { useRef } from "react";
import Modal, { ModalBody, ModalFooter } from "./Modal";
import Button from "./Button";

/**
 * The yes/no gate in front of anything consequential — cancelling a task, rejecting a hire
 * request, approving a worker, declaring cash paid.
 *
 * Same shell as SuspendUserDialog and RejectWorkerDialog, minus the textarea: those two collect
 * a reason that gets emailed, this one only needs an answer. Drive it through `useConfirm`
 * rather than mounting it by hand.
 *
 * Focus lands on Cancel, never on the confirm button. The whole point is that a stray Enter
 * on a dialog you did not expect must not commit the thing you were being warned about.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  submitting = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  if (!open) return null;

  return (
    <Modal
      open
      // Undismissable while the action is in flight, matching SuspendUserDialog.
      onClose={submitting ? undefined : onCancel}
      title={title}
      size="sm"
      trapFocus
      lockScroll
      initialFocusRef={cancelRef}
    >
      <ModalBody>
        <div className="text-sm leading-relaxed text-ink-body">{body}</div>
      </ModalBody>

      <ModalFooter>
        <Button
          ref={cancelRef}
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          {cancelLabel}
        </Button>
        <Button type="button" variant={tone} onClick={onConfirm} loading={submitting}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
