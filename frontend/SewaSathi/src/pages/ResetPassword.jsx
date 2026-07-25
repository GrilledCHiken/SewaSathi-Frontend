import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { resetPassword } from "../api/authApi";

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

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success("Password reset. Please sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "This reset link is invalid or has expired.");
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">Choose a new password for your account.</p>

        {!token ? (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
            This link is missing a reset token. Please request a new one.
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-800">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
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
