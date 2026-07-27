import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import useDesktopNotifications from "../hooks/useDesktopNotifications";

function BellIcon() {
  return (
    <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
      />
    </svg>
  );
}

export default function AccountSecurity() {
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const desktopAlerts = useDesktopNotifications();
  const { logoutEverywhere } = useAuth();
  const navigate = useNavigate();

  /**
   * Permission is requested from this click and nowhere else. Browsers reject a prompt that
   * is not tied to a user gesture, and Chrome permanently blocks sites that ask on load.
   */
  const toggleDesktopAlerts = async () => {
    if (desktopAlerts.enabled) {
      desktopAlerts.disable();
      return;
    }

    const result = await desktopAlerts.requestPermission();
    if (result === "granted") {
      toast.success("Desktop alerts are on.");
    } else if (result === "denied") {
      toast.info("Your browser blocked notifications for this site.");
    }
  };

  const handleLogoutEverywhere = async () => {
    setSigningOutEverywhere(true);
    try {
      await logoutEverywhere();
      toast.success("Signed out on all devices.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Could not sign out everywhere. Please try again.");
      setSigningOutEverywhere(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-navy">Security</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Control how your account is protected when signing in.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <BellIcon />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">Desktop alerts</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Show messages and job updates as desktop notifications when Sewa Sathi is open in
              a background tab. Nothing is shown while you are looking at the page — the bell
              already covers that.
            </p>

            {!desktopAlerts.supported && (
              <p className="mt-3 text-sm text-slate-500">
                This browser does not support desktop notifications.
              </p>
            )}

            {desktopAlerts.supported && desktopAlerts.permission === "denied" && (
              <p className="mt-3 text-sm text-slate-500">
                Notifications are blocked for this site. Re-allow them in your browser's site
                settings to turn this on.
              </p>
            )}

            {desktopAlerts.supported && desktopAlerts.permission !== "denied" && (
              <>
                <button
                  type="button"
                  role="switch"
                  aria-checked={desktopAlerts.enabled}
                  aria-label="Desktop alerts"
                  onClick={toggleDesktopAlerts}
                  className={`mt-4 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    desktopAlerts.enabled ? "bg-brand" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition ${
                      desktopAlerts.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="ml-3 align-middle text-sm font-medium text-slate-700">
                  {desktopAlerts.enabled ? "On" : "Off"}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-base font-semibold text-slate-900">Signed-in devices</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Signing in creates a session that renews itself while you are active and ends after a
          period of inactivity. If you think someone else has access to your account, sign out
          everywhere — every device will have to sign in again.
        </p>
        <button
          type="button"
          onClick={handleLogoutEverywhere}
          disabled={signingOutEverywhere}
          className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {signingOutEverywhere ? "Signing out…" : "Sign out everywhere"}
        </button>
      </section>
    </div>
  );
}
