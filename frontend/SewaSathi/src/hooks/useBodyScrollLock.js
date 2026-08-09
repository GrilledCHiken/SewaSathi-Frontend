import { useEffect } from "react";

/**
 * Stops the document itself from scrolling while a full-viewport surface is
 * mounted (the chat shell, an open modal).
 *
 * Both <html> and <body> are locked: body alone is enough on desktop, but iOS
 * Safari happily keeps scrolling the root when only the body is pinned.
 * `overscroll-behavior: none` on the root kills the rubber-band/pull-to-refresh
 * that otherwise still moves the page when an inner scroller hits its end.
 *
 * Each value is saved and restored rather than reset to the default, so nesting
 * works: a modal opened over the locked chat page restores "hidden" on close
 * instead of unlocking the page underneath it.
 */
export function useBodyScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const root = document.documentElement;
    const { body } = document;

    const previous = {
      rootOverflow: root.style.overflow,
      rootOverscroll: root.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
    };

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscroll;
      body.style.overflow = previous.bodyOverflow;
    };
  }, [enabled]);
}

export default useBodyScrollLock;
