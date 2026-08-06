import { useEffect, useState } from "react";

/**
 * Loads Google Identity Services on demand and reports when `google.accounts.id` is usable.
 *
 * The script is fetched once per page load and shared by every caller — the promise lives at
 * module scope, so mounting the button on both /login and /signup/user does not pull it twice.
 * It is loaded here rather than from a <script> tag in index.html so that a visitor who never
 * reaches an auth screen never fetches it, and so a failure is something the component can
 * render around instead of a silently missing global.
 *
 * @returns {{ status: "loading" | "ready" | "error", api: object | null }}
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";

let loadPromise = null;

function loadGoogleIdentity() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        reject(new Error("Google Identity Services loaded without accounts.id"));
      }
    };
    script.onerror = () => {
      // Cleared so a later mount can retry — an offline first visit should not disable the
      // button for the rest of the session.
      loadPromise = null;
      reject(new Error("Could not load Google Identity Services"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export default function useGoogleIdentity() {
  const [state, setState] = useState({ status: "loading", api: null });

  useEffect(() => {
    let cancelled = false;

    loadGoogleIdentity()
      .then((api) => {
        if (!cancelled) setState({ status: "ready", api });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", api: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
