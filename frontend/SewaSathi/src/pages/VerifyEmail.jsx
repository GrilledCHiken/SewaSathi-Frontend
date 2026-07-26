import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { resendVerification, verifyEmail } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

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

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useAuth();

  const [status, setStatus] = useState(token ? "verifying" : "missing");
  const [resending, setResending] = useState(false);
  // Prefilled when we already know who is asking; typed in otherwise.
  const [email, setEmail] = useState(() => user?.email ?? "");

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("failed"));
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResending(true);
    try {
      await resendVerification(email.trim());
      // Worded so it holds whether or not that address has an account - the API
      // deliberately does not say, and neither should this message.
      toast.success("If that address has an unverified account, a new link is on its way.");
    } catch {
      toast.error("Could not send the email. Please try again shortly.");
    } finally {
      setResending(false);
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

      <div className="w-full max-w-[420px] rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-10">
        {status === "verifying" && (
          <p className="text-sm text-slate-500">Verifying your email...</p>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email verified!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your email address has been confirmed.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark"
            >
              Continue to Sign In
            </Link>
          </>
        )}

        {(status === "failed" || status === "missing") && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {status === "missing" ? "Missing verification link" : "Link expired or invalid"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {status === "missing"
                ? "This page needs a verification token from your email."
                : "This verification link is no longer valid. Request a new one below."}
            </p>
            {/*
              An expired link leaves the user signed out, and an unverified account cannot
              sign in at all - so asking for the address here is the only route back. The
              endpoint answers identically for unknown addresses, so this cannot be used to
              discover which emails have accounts.
            */}
            <form className="mt-6 text-left" onSubmit={handleResend}>
              <label htmlFor="resend-email" className="block text-sm font-semibold text-slate-800">
                Email address
              </label>
              <input
                id="resend-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
              <button
                type="submit"
                disabled={resending}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? "Sending..." : "Send a new link"}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
