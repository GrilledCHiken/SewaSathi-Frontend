import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { forgotPassword } from "../api/authApi";

function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
          <LogoIcon />
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-900">SewaSathi</span>
      </Link>

      <div className="w-full max-w-[420px] rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot your password?</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800">
            If an account exists for {email}, a reset link is on its way. Check the server console
            for the link during development (no email provider is configured yet).
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-brand transition hover:text-brand-dark">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
