import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll handling for client-side navigation.
 *
 * React Router restores nothing and honours no #hash on its own, so without this
 * a footer link clicked from the bottom of a long page opens the next one already
 * scrolled halfway down, and /contact#faq lands at the top of Contact.
 *
 * The retry loop is not defensive padding: every public page but Home is lazy
 * (see App.jsx), so on a first visit the hash target does not exist yet when this
 * effect runs — the Suspense fallback is still on screen. Giving up on frame one
 * would silently do nothing exactly once per page, which is the hardest kind of
 * bug to notice.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    let frame;
    let tries = 0;
    const findTarget = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ behavior, block: "start" });
      } else if (tries++ < 40) {
        frame = requestAnimationFrame(findTarget);
      }
    };
    findTarget();

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}
