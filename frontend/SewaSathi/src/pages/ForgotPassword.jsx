import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import AuthLayout, { AuthFooterLink } from "../components/auth/AuthLayout";
import PasswordChecklist from "../components/PasswordChecklist";
import Alert from "../components/ui/Alert";
import BackLink from "../components/ui/BackLink";
import Button from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
} from "../components/ui/icons";
import {
  EMAIL_REGEX,
  OTP_LENGTH,
  isPasswordStrong,
  parseFieldError,
  sanitizeOtp,
} from "../utils/validation";

/** mm:ss, for the two countdowns. */
function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const STEP_COPY = {
  email: {
    title: "Forgot your password?",
    chip: "Step 1 of 3",
  },
  code: {
    title: "Check your email",
    chip: "Step 2 of 3",
  },
  password: {
    title: "Choose a new password",
    subtitle: "Pick something you have not used here before.",
    chip: "Step 3 of 3",
  },
};

/**
 * Password reset: prove the mailbox, then choose a new password. One route rather than three,
 * because the challenge token only exists in memory — a bookmark or refresh of step two or
 * three could never work, so reloading drops back to the email step. The account is untouched
 * until the last call.
 */
function ForgotPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    requestPasswordReset,
    resendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
  } = useAuth();

  const [step, setStep] = useState("email");
  const [challenge, setChallenge] = useState(null);

  // Prefilled from the login page, so someone who typed their address there does not retype it.
  const [email, setEmail] = useState(() => location.state?.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  // Guards the auto-submit below from firing twice for the same six digits.
  const submittedCodeRef = useRef("");

  // One timer for both countdowns; they only ever tick together, and only matter once a
  // challenge exists.
  useEffect(() => {
    if (!challenge) return undefined;
    const id = setInterval(() => {
      setExpiresIn((value) => (value > 0 ? value - 1 : 0));
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [challenge]);

  const expired = Boolean(challenge) && expiresIn <= 0;

  const applyChallenge = (next) => {
    setChallenge(next);
    setExpiresIn(next.expiresInSeconds);
    setResendIn(next.resendAvailableInSeconds);
  };

  const startOver = () => {
    setStep("email");
    setChallenge(null);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    submittedCodeRef.current = "";
  };

  // --- step 1: the address -------------------------------------------------------------

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setErrors({ email: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      applyChallenge(await requestPasswordReset({ email: trimmed }));
      setEmail(trimmed);
      setStep("code");
      toast.success(`We sent a ${OTP_LENGTH}-digit code to ${trimmed}.`);
    } catch (err) {
      // A 404 means "no account here", which the user fixes by editing the field, so it
      // belongs under the input rather than only in a toast.
      const { message } = parseFieldError(err, ["email"]);
      const text = message ?? "Could not start a password reset. Please try again.";
      setErrors({ email: text });
      toast.error(text);
    } finally {
      setLoading(false);
    }
  };

  // --- step 2: the code ----------------------------------------------------------------

  const submitCode = useCallback(
    async (value) => {
      submittedCodeRef.current = value;
      setLoading(true);
      setErrors({});
      try {
        const next = await verifyPasswordResetOtp({
          challengeToken: challenge.challengeToken,
          code: value,
        });
        applyChallenge(next);
        setStep("password");
      } catch (err) {
        // The server counts the attempts, so its message is the one worth showing — it names
        // how many are left.
        const message =
          err?.response?.data?.message ?? "Could not verify that code. Please try again.";
        setErrors({ code: message });
        toast.error(message);
        setCode("");
        submittedCodeRef.current = "";
      } finally {
        setLoading(false);
      }
    },
    [challenge, verifyPasswordResetOtp],
  );

  // Six digits is the whole form, and they usually arrive by autofill, so no button press.
  useEffect(() => {
    if (
      step === "code" &&
      code.length === OTP_LENGTH &&
      !loading &&
      !expired &&
      code !== submittedCodeRef.current
    ) {
      submitCode(code);
    }
  }, [code, expired, loading, step, submitCode]);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (code.length !== OTP_LENGTH) {
      setErrors({ code: `Enter the ${OTP_LENGTH}-digit code we emailed you.` });
      return;
    }
    submitCode(code);
  };

  const handleResend = async () => {
    setResending(true);
    setErrors({});
    try {
      applyChallenge(await resendPasswordResetOtp({ challengeToken: challenge.challengeToken }));
      setCode("");
      submittedCodeRef.current = "";
      toast.success(`New code sent to ${challenge.email}.`);
    } catch (err) {
      const message =
        err?.response?.data?.message ?? "Could not send another code. Please try again.";
      setErrors({ code: message });
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  // --- step 3: the new password --------------------------------------------------------

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const next = {};
    if (!isPasswordStrong(password)) {
      next.password = "Password does not meet all the requirements below.";
    }
    if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await resetPassword({
        challengeToken: challenge.challengeToken,
        newPassword: password,
      });
      toast.success("Password updated. Sign in with your new password.");
      navigate("/login", {
        replace: true,
        state: { passwordReset: true, email: challenge.email },
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ?? "Could not set that password. Please try again.";
      setErrors({ password: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // --- shared chrome -------------------------------------------------------------------

  const copy = STEP_COPY[step];

  const subtitle =
    step === "email" ? (
      "Enter the email on your account and we'll send you a code to reset your password."
    ) : step === "code" ? (
      <>
        We sent a {OTP_LENGTH}-digit code to{" "}
        <span className="font-semibold text-ink">{challenge?.email}</span>. Enter it below to
        continue.
      </>
    ) : (
      copy.subtitle
    );

  return (
    <AuthLayout
      width="max-w-[440px]"
      title={copy.title}
      subtitle={subtitle}
      topBar={
        <div className="flex items-center justify-between gap-3">
          {step === "email" ? (
            <BackLink to="/login" label="Back to sign in" />
          ) : (
            <button
              type="button"
              onClick={startOver}
              className="inline-flex items-center gap-1.5 rounded-field px-1 py-0.5 text-sm font-medium text-ink-faint transition hover:text-ink-body focus-ring"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Start over
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <ShieldIcon className="h-3.5 w-3.5" />
            {copy.chip}
          </span>
        </div>
      }
      notice={
        expired && step !== "email" ? (
          <Alert tone="warning" title="That code has expired">
            Codes are only good for a few minutes. Start over to get a new one.
          </Alert>
        ) : null
      }
      footer={<AuthFooterLink prompt="Remembered it?" to="/login" label="Sign in" />}
    >
      {step === "email" && (
        <form className="mt-7 space-y-5" onSubmit={handleEmailSubmit} noValidate>
          <Field id="email" label="Email" error={errors.email}>
            {(field) => (
              <Input
                {...field}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({});
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                required
                leadingIcon={<MailIcon className="h-5 w-5" />}
              />
            )}
          </Field>

          <Button
            type="submit"
            size="lg"
            shape="rounded"
            fullWidth
            loading={loading}
            iconRight={<ArrowRightIcon className="h-5 w-5" />}
          >
            {loading ? "Sending code..." : "Send reset code"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <>
          <form className="mt-7 space-y-5" onSubmit={handleCodeSubmit} noValidate>
            <Field id="otp" label="Verification code" error={errors.code}>
              {(field) => (
                <Input
                  {...field}
                  type="text"
                  inputMode="numeric"
                  // Lets the browser (and iOS) offer the code straight out of the email.
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => {
                    setCode(sanitizeOtp(e.target.value));
                    setErrors({});
                  }}
                  placeholder="000000"
                  maxLength={OTP_LENGTH}
                  disabled={loading || expired}
                  autoFocus
                  required
                  inputClassName="text-center text-2xl font-bold tracking-[0.5em] tabular-nums"
                />
              )}
            </Field>

            {/* Polite, not assertive: a countdown that interrupted every second would make
                the field unusable with a screen reader. */}
            <p role="status" aria-live="polite" className="text-center text-sm text-ink-muted">
              {expired
                ? "This code is no longer valid."
                : `Code expires in ${formatCountdown(expiresIn)}.`}
            </p>

            <Button
              type="submit"
              size="lg"
              shape="rounded"
              fullWidth
              loading={loading}
              disabled={expired}
              iconRight={<ArrowRightIcon className="h-5 w-5" />}
            >
              {loading ? "Verifying..." : "Verify code"}
            </Button>
          </form>

          <div className="mt-6 border-t border-line-soft pt-5 text-center">
            <p className="text-sm text-ink-muted">Didn&apos;t get it? Check your spam folder.</p>
            <Button
              type="button"
              variant="quiet"
              size="sm"
              className="mt-1"
              onClick={handleResend}
              loading={resending}
              disabled={resendIn > 0 || expired}
            >
              {resendIn > 0 ? `Resend code in ${formatCountdown(resendIn)}` : "Send a new code"}
            </Button>
            <p className="mt-3 text-xs text-ink-faint">
              Wrong address?{" "}
              <button
                type="button"
                onClick={startOver}
                className="rounded font-semibold text-brand hover:text-brand-dark focus-ring"
              >
                Go back and re-enter it
              </button>
              .
            </p>
          </div>
        </>
      )}

      {step === "password" && (
        <form className="mt-7 space-y-5" onSubmit={handlePasswordSubmit} noValidate>
          <Field id="new-password" label="New password" error={errors.password}>
            {(field) => (
              <Input
                {...field}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Create a strong password"
                autoComplete="new-password"
                autoFocus
                required
                leadingIcon={<LockIcon className="h-5 w-5" />}
                trailing={
                  <button
                    type="button"
                    className="rounded-field p-1.5 text-ink-faint transition hover:bg-surface-sunken hover:text-ink-body focus-ring"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} className="h-5 w-5" />
                  </button>
                }
              />
            )}
          </Field>

          <PasswordChecklist value={password} show={password.length > 0} />

          <Field
            id="confirm-password"
            label="Confirm new password"
            error={errors.confirmPassword}
          >
            {(field) => (
              <Input
                {...field}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
                leadingIcon={<LockIcon className="h-5 w-5" />}
              />
            )}
          </Field>

          <p className="text-xs text-ink-faint">
            Setting a new password signs you out everywhere else.
          </p>

          <Button
            type="submit"
            size="lg"
            shape="rounded"
            fullWidth
            loading={loading}
            disabled={expired}
            iconRight={<ArrowRightIcon className="h-5 w-5" />}
          >
            {loading ? "Updating password..." : "Update password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
