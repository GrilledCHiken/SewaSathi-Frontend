import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { cn } from "../../utils/cn";
import { XIcon } from "./icons";

/**
 * Dialog shell shared by DocumentViewerModal, AdminUserDetailModal and NewsletterPopup.
 * Escape closes, a backdrop click closes, focus moves in on open, and the surface is a
 * labelled `role="dialog" aria-modal="true"`.
 *
 * `trapFocus` and `lockScroll` default OFF and are turned on per call site.
 *
 * Portalled to <body> at z-60 so it clears the sticky marketing header and the dashboard
 * sidebar, both at z-50.
 */

const SIZES = Object.freeze({
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
});

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  trapFocus = false,
  lockScroll = false,
  initialFocusRef,
  hideCloseButton = false,
  className = "",
  children,
}) {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;

  // Escape to close.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Move focus into the dialog once it opens.
  useEffect(() => {
    if (!open) return;
    const target = initialFocusRef?.current || closeButtonRef.current || panelRef.current;
    target?.focus();
  }, [open, initialFocusRef]);

  // Opt-in scroll lock, shared with the chat shell. The hook restores whatever
  // overflow the page had rather than assuming it was the default, so a modal
  // opened over an already-locked surface does not unlock it on close.
  useBodyScrollLock(open && lockScroll);

  // Opt-in focus trap: cycle Tab within the dialog.
  useEffect(() => {
    if (!open || !trapFocus) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, trapFocus]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-end justify-center overflow-y-auto bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      // Only a click that starts and ends on the backdrop itself closes —
      // dragging a text selection out of the panel must not dismiss it.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-t-panel bg-surface shadow-e3 outline-none sm:rounded-panel",
          "animate-fade-up",
          SIZES[size] || SIZES.md,
          className,
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-bold text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>

            {!hideCloseButton && (
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1.5 -mt-1 shrink-0 rounded-field p-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink focus-ring"
              >
                <XIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Footer action row — right-aligned on desktop, stacked on mobile. */
export function ModalFooter({ className = "", children }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-line-soft px-5 py-4 sm:flex-row sm:justify-end sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Body wrapper with the standard gutters. */
export function ModalBody({ className = "", children }) {
  return <div className={cn("px-5 py-5 sm:px-6", className)}>{children}</div>;
}
