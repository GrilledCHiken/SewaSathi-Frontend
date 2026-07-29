import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import PasswordChecklist from "../../components/PasswordChecklist";
import {
  parseSignupError,
  sanitizePhone,
  validateSignupForm,
} from "../../utils/validation";
import AuthLayout, {
  AuthFooterLink,
  DefaultAside,
} from "../../components/auth/AuthLayout";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "../../components/ui/icons";

function BriefcaseIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

/** Worker-facing pitch, in place of the customer one the shell defaults to. */
const WORKER_ASIDE = (
  <DefaultAside
    heading={
      <>
        Earn on your
        <br />
        own terms.
      </>
    }
    blurb="Set your own rate, pick the jobs that fit your week, and get paid securely for every task you complete."
    points={[
      "Set your own rates and schedule",
      "Get paid within 24 hours of completion",
      "Build a verified reputation",
    ]}
    quote="I pick up jobs between my regular shifts. The work is steady and payment has never been late."
    quoteAuthor="Rajesh Thapa · Kathmandu"
    quoteInitials="RT"
  />
);

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

  const passwordToggle = (
    <button
      type="button"
      className="rounded-field p-1.5 text-ink-faint transition hover:bg-surface-sunken hover:text-ink-body focus-ring"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      <EyeIcon open={showPassword} className="h-5 w-5" />
    </button>
  );

  return (
    <AuthLayout
      width="max-w-lg"
      aside={WORKER_ASIDE}
      title="Create your account"
      subtitle="Set up your worker profile and start accepting tasks."
      topBar={
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-field px-1 py-0.5 text-sm font-medium text-ink-faint transition hover:text-ink-body focus-ring"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <BriefcaseIcon />
            Worker Account
          </span>
        </div>
      }
      notice={
        <Alert tone="success">
          After signing up, our team reviews new worker accounts before you can be
          hired. You&apos;ll be able to add your skills, rate, and service area once
          approved.
        </Alert>
      }
      footer={<AuthFooterLink prompt="Already have an account?" to="/login" label="Log in" />}
    >
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Field id="fullName" label="Full Name" error={errors.fullName}>
          {(field) => (
            <Input
              {...field}
              type="text"
              value={form.fullName}
              onChange={update("fullName")}
              placeholder="Ram Bahadur"
              autoComplete="name"
              maxLength={150}
              required
              leadingIcon={<UserIcon className="h-5 w-5" />}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email" error={errors.email}>
            {(field) => (
              <Input
                {...field}
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={255}
                required
                leadingIcon={<MailIcon className="h-5 w-5" />}
              />
            )}
          </Field>

          <Field id="phone" label="Phone Number" error={errors.phone}>
            {(field) => (
              <Input
                {...field}
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={update("phone")}
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                maxLength={10}
                required
                leadingIcon={<PhoneIcon className="h-5 w-5" />}
              />
            )}
          </Field>
        </div>

        <div>
          <Field id="password" label="Password" error={errors.password}>
            {(field) => (
              <Input
                {...field}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                onFocus={() => setPasswordTouched(true)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                leadingIcon={<LockIcon className="h-5 w-5" />}
                trailing={passwordToggle}
              />
            )}
          </Field>
          <PasswordChecklist
            value={form.password}
            accent="emerald"
            show={passwordTouched || form.password.length > 0}
          />
        </div>

        <Field id="confirmPassword" label="Confirm Password" error={errors.confirmPassword}>
          {(field) => (
            <>
              <Input
                {...field}
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                placeholder="Repeat your password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                leadingIcon={<LockIcon className="h-5 w-5" />}
                trailing={
                  passwordsMatch ? (
                    <span className="pr-2 text-success" aria-hidden="true">
                      <CheckIcon className="h-5 w-5" />
                    </span>
                  ) : null
                }
              />
              {/* Softer than an error: the field is simply not finished yet. */}
              {!errors.confirmPassword && passwordsMismatch && (
                <p className="mt-1.5 text-xs font-medium text-warning-ink">
                  Passwords don&apos;t match yet.
                </p>
              )}
            </>
          )}
        </Field>

        <div className="pt-1">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={toggleAgreed}
              required
              aria-invalid={Boolean(errors.agreed)}
              aria-describedby={errors.agreed ? "agreed-error" : undefined}
              className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong text-emerald-600 focus:ring-emerald-500/30"
            />
            <span className="text-sm leading-relaxed text-ink-body">
              I agree to the{" "}
              <Link to="/terms" className="font-medium text-emerald-700 hover:text-emerald-800">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-medium text-emerald-700 hover:text-emerald-800">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.agreed && (
            <p id="agreed-error" className="mt-1.5 text-sm font-medium text-danger">
              {errors.agreed}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="emerald"
          size="lg"
          shape="rounded"
          fullWidth
          loading={loading}
          disabled={success}
          iconRight={<ArrowRightIcon className="h-5 w-5" />}
        >
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default WorkerSignup;
