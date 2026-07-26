import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getCurrentUser } from "../api/authApi";
import { setToken } from "../api/tokenStorage";

/**
 * Landing point for a completed social sign-in.
 *
 * The backend redirects here with the JWT in the query string, because the SPA and API are
 * separate origins so a cookie is not available. The token is stored and the history entry
 * is replaced immediately, so it does not linger in the address bar or in browser history.
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  // React 18+ mounts effects twice in development; without this the token would be
  // consumed and the profile fetched twice.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setError("Sign-in did not complete. Please try again.");
      return;
    }

    setToken(token);
    // Drop the token from the URL before anything else can read it.
    window.history.replaceState({}, "", "/oauth/callback");

    getCurrentUser()
      .then((user) => {
        toast.success(`Welcome, ${user.fullName || user.email}!`);
        const target =
          user.role === "ADMIN" ? "/admin" : user.role === "WORKER" ? "/worker" : "/dashboard";
        // Full reload so AuthContext picks up the freshly stored token.
        window.location.replace(target);
      })
      .catch(() => setError("We could not load your profile. Please sign in again."));
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-bold text-navy">Sign-in failed</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
        <p className="mt-4 text-sm text-slate-600">Finishing sign-in…</p>
      </div>
    </div>
  );
}
