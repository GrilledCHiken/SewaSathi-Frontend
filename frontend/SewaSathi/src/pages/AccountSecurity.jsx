import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getCurrentUser, setTwoFactor } from "../api/authApi";

function ShieldIcon() {
  return (
    <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 3l7 3v6c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z"
      />
    </svg>
  );
}

export default function AccountSecurity() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setEnabled(Boolean(user.twoFactorEnabled));
        setEmail(user.email);
      })
      .catch(() => toast.error("Could not load your security settings."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    // Optimistic: the switch responds immediately, and reverts if the call fails.
    setEnabled(next);
    try {
      await setTwoFactor(next);
      toast.success(
        next
          ? "Two-factor authentication is on. You'll get a code by email each time you sign in."
          : "Two-factor authentication is off.",
      );
    } catch {
      setEnabled(!next);
      toast.error("Could not update the setting. Please try again.");
    } finally {
      setSaving(false);
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
            <ShieldIcon />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              Two-factor authentication
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              When this is on, every sign-in needs a 6-digit code sent to{" "}
              <strong className="text-slate-800">{email || "your email address"}</strong>. Even
              if someone learns your password, they cannot get in without your inbox.
            </p>

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Two-factor authentication"
              onClick={toggle}
              disabled={loading || saving}
              className={`mt-4 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                enabled ? "bg-brand" : "bg-slate-300"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="ml-3 align-middle text-sm font-medium text-slate-700">
              {loading ? "Loading…" : enabled ? "On" : "Off"}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-base font-semibold text-slate-900">Sign-ins from new devices</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          This is always on and cannot be switched off. Whenever your account is accessed from a
          device we have not seen before, we email you a code to confirm it is you, then let you
          know the sign-in happened.
        </p>
      </section>
    </div>
  );
}
