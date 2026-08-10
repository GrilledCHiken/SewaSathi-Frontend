import { useEffect, useRef, useState } from "react";
import useGoogleIdentity from "../../hooks/useGoogleIdentity";
import Spinner from "../ui/Spinner";

/**
 * The "Sign in with Google" button, under an "or" divider, for the login and customer signup
 * screens.
 *
 * Google renders the button itself: `renderButton` is the supported path and carries the FedCM
 * plumbing a hand-rolled button would have to reimplement. `width` is matched to the container
 * so it lines up with the Sign In button above.
 *
 * With no `VITE_GOOGLE_CLIENT_ID` configured this renders nothing, so a clone without Google
 * credentials degrades to password-only rather than showing a button that cannot work.
 */

/** GSI refuses widths above 400px. The signup card is wider than that. */
const MAX_BUTTON_WIDTH = 400;

export default function GoogleSignInButton({ onCredential, text = "signin_with", className = "" }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const { status, api } = useGoogleIdentity();
  const containerRef = useRef(null);

  // The callback is handed to Google once at initialize time but the handler changes every
  // render, so it is read through a ref — re-initializing would tear the button down mid-click.
  const handlerRef = useRef(onCredential);
  useEffect(() => {
    handlerRef.current = onCredential;
  }, [onCredential]);

  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    setWidth(Math.min(containerRef.current.offsetWidth, MAX_BUTTON_WIDTH));
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || !clientId || !containerRef.current || width === 0) return;

    api.initialize({
      client_id: clientId,
      callback: (response) => handlerRef.current?.(response.credential),
      // One Tap's automatic prompt stays off: it appears over the page unbidden, and the point
      // of this component is a button the user chose to press.
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    api.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      logo_alignment: "center",
      text,
      width,
    });
  }, [api, clientId, status, text, width]);

  if (!clientId) return null;

  return (
    <div className={className}>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center">
          {/* bg-surface, not bg-white: this sits on the AuthLayout card. */}
          <span className="bg-surface px-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
            or
          </span>
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-center">
        {/* Google fills this div. It stays mounted through loading so the measured width is
            available by the time renderButton is called. */}
        <div ref={containerRef} className="w-full" />

        {status === "loading" && <Spinner size="sm" />}
      </div>

      {status === "error" && (
        <p role="status" className="mt-2 text-center text-xs text-ink-muted">
          Google sign-in is unavailable right now. Use your email and password instead.
        </p>
      )}
    </div>
  );
}
