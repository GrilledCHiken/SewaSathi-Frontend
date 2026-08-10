import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetched on the first question asked, never before. UserMenu guards Sign Out with this hook
 * and sits in the eagerly-loaded marketing header, so a static import would pull Modal and
 * react-dom/createPortal into the main chunk for visitors who never sign in — the same reason
 * components/ui/index.js does not re-export Modal.
 */
// eslint-disable-next-line react-refresh/only-export-components -- lazy handle, not an export
const ConfirmDialog = lazy(() => import("../components/ui/ConfirmDialog"));

/**
 * Puts a yes/no dialog in front of an action without restructuring the handler that does it.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *
 *   const handleCancel = async (id) => {
 *     const ok = await confirm({ title: "Cancel this task?", body: "...", confirmLabel: "Cancel task" });
 *     if (!ok) return;
 *     ...unchanged...
 *   };
 *
 *   return (<>...{confirmDialog}</>);
 *
 * `confirm` resolves true or false; Escape, the backdrop and the cancel button all resolve
 * false. The dialog closes the moment the answer is known, so the busy state that already
 * exists on the calling button ("Cancelling...", a disabled row) still covers the request —
 * the dialog never needs to know an action is in flight.
 *
 * Returns the rendered element rather than a props bag: one thing to drop into JSX, and no
 * way to wire a call site up wrong.
 */
export default function useConfirm() {
  const [request, setRequest] = useState(null);
  const requestRef = useRef(null);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    [],
  );

  const settle = useCallback((answer) => {
    setRequest(null);
    requestRef.current?.resolve(answer);
    requestRef.current = null;
  }, []);

  // A page that unmounts mid-question would otherwise leave its caller awaiting forever.
  useEffect(
    () => () => {
      requestRef.current?.resolve(false);
    },
    [],
  );

  // Nothing is mounted until there is a question, so the chunk above is only ever requested
  // by someone who clicked something that needed asking about.
  const confirmDialog = request ? (
    <Suspense fallback={null}>
      <ConfirmDialog
        open
        title={request.title}
        body={request.body}
        confirmLabel={request.confirmLabel}
        cancelLabel={request.cancelLabel}
        tone={request.tone}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </Suspense>
  ) : null;

  return [confirm, confirmDialog];
}

export { useConfirm };
