import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import PasswordChecklist from "../../components/PasswordChecklist";
import { parseSignupError, sanitizePhone, validateSignupForm } from "../../utils/validation";

function LogoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BriefcaseIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg
        className="h-5 w-5 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-slate-800 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const errorInputClass = "border-red-300 focus:border-red-400 focus:ring-red-500/20";

function WorkerSignup() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const { registerWorker } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => {
    const value = field === "phone" ? sanitizePhone(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const toggleAgreed = (e) => {
    setAgreed(e.target.checked);
    setErrors((prev) => (prev.agreed ? { ...prev, agreed: "" } : prev));
  };

  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateSignupForm(form, { agreed });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setPasswordTouched(true);
      return;
    }

    setLoading(true);
    try {
      await registerWorker({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setSuccess(true);
      toast.success("Account created! Your application is under review — sign in to track it.");
      navigate("/login", {
        replace: true,
        state: { registered: true, email: form.email.trim(), role: "WORKER" },
      });
    } catch (err) {
      // Same as the customer form: a duplicate address is only detectable server-side, so
      // that message has to reach the email field.
      const { field, message } = parseSignupError(err);
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: message }));
      }
      toast.error(message || "Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center overflow-hidden bg-slate-50 px-4 py-10 sm:py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-emerald-400/5 blur-3xl" />

      <Link
        to="/"
        className="relative mb-8 flex items-center gap-2.5 transition hover:opacity-90"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
          <LogoIcon />
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-900">
          SewaSathi
        </span>
      </Link>

      <div className="relative w-full max-w-lg animate-fade-up rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="flex items-center justify-between">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition hover:text-slate-600"
          >
            <span aria-hidden="true">←</span> Back
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <BriefcaseIcon />
            Worker Account
          </span>
        </div>

        <div className="mt-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Set up your worker profile and start accepting tasks.
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3.5 text-emerald-800">
          <InfoIcon />
          <p className="text-xs leading-relaxed sm:text-sm">
            After signing up, our team reviews new worker accounts before you can be hired.
            You&apos;ll be able to add your skills, rate, and service area once approved.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-semibold text-slate-800"
            >
              Full Name
            </label>
            <div className="group relative mt-2">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-600">
                <UserIcon />
              </span>
              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={update("fullName")}
                placeholder="Ram Bahadur"
                autoComplete="name"
                maxLength={150}
                required
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                className={`${inputClass} ${errors.fullName ? errorInputClass : ""}`}
              />
            </div>
            {errors.fullName && (
              <p id="fullName-error" className="mt-1.5 text-sm text-red-600">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-800"
              >
                Email
              </label>
              <div className="group relative mt-2">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-600">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={255}
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`${inputClass} ${errors.email ? errorInputClass : ""}`}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-red-600">
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-slate-800"
              >
                Phone Number
              </label>
              <div className="group relative mt-2">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-600">
                  <PhoneIcon />
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="98XXXXXXXX"
                  autoComplete="tel"
                  maxLength={10}
                  required
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  className={`${inputClass} ${errors.phone ? errorInputClass : ""}`}
                />
              </div>
              {errors.phone && (
                <p id="phone-error" className="mt-1.5 text-sm text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-800"
            >
              Password
            </label>
            <div className="group relative mt-2">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-600">
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                onFocus={() => setPasswordTouched(true)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`${inputClass} pr-11 ${errors.password ? errorInputClass : ""}`}
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:text-slate-600"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-red-600">
                {errors.password}
              </p>
            )}
            <PasswordChecklist
              value={form.password}
              accent="emerald"
              show={passwordTouched || form.password.length > 0}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-800"
            >
              Confirm Password
            </label>
            <div className="group relative mt-2">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-emerald-600">
                <LockIcon />
              </span>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                placeholder="Repeat your password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                className={`${inputClass} pr-11 ${errors.confirmPassword ? errorInputClass : ""}`}
              />
              {passwordsMatch && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                  <CheckIcon />
                </span>
              )}
            </div>
            {errors.confirmPassword ? (
              <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            ) : (
              passwordsMismatch && (
                <p className="mt-1.5 text-xs font-medium text-amber-600">Passwords don&apos;t match yet.</p>
              )
            )}
          </div>

          <div className="pt-1">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={toggleAgreed}
                required
                aria-invalid={Boolean(errors.agreed)}
                aria-describedby={errors.agreed ? "agreed-error" : undefined}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
              />
              <span className="text-sm leading-relaxed text-slate-600">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreed && (
              <p id="agreed-error" className="mt-1.5 text-sm text-red-600">
                {errors.agreed}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
            {!loading && <ArrowRightIcon />}
          </button>
        </form>
      </div>

      <p className="relative mt-8 text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand transition hover:text-brand-dark"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

export default WorkerSignup;
