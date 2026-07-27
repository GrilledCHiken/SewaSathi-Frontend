import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sewasathi_desktop_alerts";

function isSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Opt-in desktop notifications for the in-app notification feed.
 *
 * Two separate pieces of state, because they are genuinely different questions: whether the
 * browser has granted permission, and whether this user actually wants the alerts. Someone
 * can grant permission once and later turn the feature off without having to revoke
 * permission in browser settings.
 */
export default function useDesktopNotifications() {
  const [permission, setPermission] = useState(() =>
    isSupported() ? Notification.permission : "unsupported",
  );
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Private browsing can refuse writes; the preference just will not persist.
    }
  }, [enabled]);

  /**
   * Must be called from a click or similar. Browsers reject a permission prompt that is not
   * tied to a user gesture, and Chrome permanently blocks sites that ask on page load.
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported()) return "unsupported";

    const result = await Notification.requestPermission();
    setPermission(result);
    setEnabled(result === "granted");
    return result;
  }, []);

  const disable = useCallback(() => setEnabled(false), []);

  /**
   * Shows a notification, but only when the tab is hidden — the in-app bell is already
   * visible otherwise, and duplicating it on screen would just be noise.
   */
  const notify = useCallback(
    ({ title, body, link }) => {
      if (!isSupported() || !enabled || permission !== "granted") return;
      if (document.visibilityState === "visible") return;

      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        // Collapses repeats of the same kind rather than stacking them up.
        tag: "sewasathi-notification",
      });

      notification.onclick = () => {
        window.focus();
        if (link) {
          window.location.href = link;
        }
        notification.close();
      };
    },
    [enabled, permission],
  );

  return {
    supported: isSupported(),
    permission,
    enabled: enabled && permission === "granted",
    requestPermission,
    disable,
    notify,
  };
}
