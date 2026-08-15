import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import AuthLayout, { AuthFooterLink } from "../components/auth/AuthLayout";
import BackLink from "../components/ui/BackLink";
import WorkerAside from "../components/auth/WorkerAside";
import WorkerSignupSteps from "../components/auth/WorkerSignupSteps";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { ArrowRightIcon, MailIcon } from "../components/ui/icons";
import { takeSignupPassword } from "../utils/signupHandoff";
import { OTP_LENGTH, sanitizeOtp } from "../utils/validation";

/** mm:ss, for the two countdowns. */
function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}


function VerifySignupOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyRegistration, resendRegistrationOtp, login } = useAuth();

  const challenge = location.state;
  const isWorker = challenge?.role === "WORKER";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(() => challenge?.expiresInSeconds ?? 0);
  const [resendIn, setResendIn] = useState(() => challenge?.resendAvailableInSeconds ?? 0);

  // Guards the auto-submit below from firing twice for the same six digits.
  const submittedCodeRef = useRef("");

  // One timer for both countdowns; they only ever tick together.
  useEffect(() => {
    const id = setInterval(() => {
      setExpiresIn((value) => (value > 0 ? value - 1 : 0));
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const expired = expiresIn <= 0;

  const submit = useCallback(
    async (value) => {
      submittedCodeRef.current = value;
      setLoading(true);
      setError("");
      try {
        await verifyRegistration({
          challengeToken: challenge.challengeToken,
          code: value,
        });



        const password = isWorker ? takeSignupPassword() : null;
        if (password) {
          try {
            await login({ email: challenge.email, password });
            toast.success("Email verified — one more step to go.");
            navigate("/signup/worker/verify", { replace: true });
            return;
          } catch {




          }
        }

        toast.success("Email verified! Please sign in to continue.");
        navigate("/login", {
          replace: true,
          state: { registered: true, email: challenge.email, role: challenge.role },
        });
      } catch (err) {
        // The server counts the attempts, so its message is the one worth showing —
        // it names how many are left.
        const message =
          err?.response?.data?.message ?? "Could not verify that code. Please try again.";
        setError(message);
        toast.error(message);
        setCode("");
        submittedCodeRef.current = "";
      } finally {
        setLoading(false);
      }
    },
    [challenge, isWorker, login, navigate, verifyRegistration],
  );

  // Six digits is the whole form, so asking for a button press as well is pure friction —
  // not least because the digits usually arrive by autofill from the email.
  useEffect(() => {
    if (code.length === OTP_LENGTH && !loading && !expired && code !== submittedCodeRef.current) {
      submit(code);
    }
  }, [code, expired, loading, submit]);

  if (!challenge?.challengeToken) {
    return <Navigate to="/signup" replace />;
  }

  const handleChange = (e) => {
    setCode(sanitizeOtp(e.target.value));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code we emailed you.`);
      return;
    }
    submit(code);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const next = await resendRegistrationOtp({ challengeToken: challenge.challengeToken });
      setExpiresIn(next.expiresInSeconds);
      setResendIn(next.resendAvailableInSeconds);
      setCode("");
      submittedCodeRef.current = "";
      toast.success(`New code sent to ${challenge.email}.`);
    } catch (err) {
      const message =
        err?.response?.data?.message ?? "Could not send another code. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  const backTo = isWorker ? "/signup/worker" : "/signup/user";

  return (
    <AuthLayout
      width="max-w-[440px]"
      aside={isWorker ? <WorkerAside /> : undefined}
      title="Verify your email"
      subtitle={
        <>
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="font-semibold text-ink">{challenge.email}</span>. Enter it below to
          finish creating your account.
        </>
      }
      topBar={
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <BackLink to={backTo} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <MailIcon className="h-3.5 w-3.5" />
              Email verification
            </span>
          </div>
          {/* Still step 1: the account is not created until this code is accepted. */}
          {isWorker && <WorkerSignupSteps current={1} />}
        </div>
      }
      notice={
        expired ? (
          <Alert tone="warning" title="That code has expired">
            Codes are only good for a few minutes. Start the signup again to get a new one.
          </Alert>
        ) : null
      }
      footer={<AuthFooterLink prompt="Already have an account?" to="/login" label="Log in" />}
    >
      <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
        <Field id="otp" label="Verification code" error={error}>
          {(field) => (
            <Input
              {...field}
              type="text"
              inputMode="numeric"
              // Lets the browser (and iOS) offer the code straight out of the email.
              autoComplete="one-time-code"
              value={code}
              onChange={handleChange}
              placeholder="000000"
              maxLength={OTP_LENGTH}
              disabled={loading || expired}
              autoFocus
              required
              inputClassName="text-center text-2xl font-bold tracking-[0.5em] tabular-nums"
            />
          )}
        </Field>

        {/* Polite, not assertive: a countdown that interrupted every second would make the
            field unusable with a screen reader. */}
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
          variant={isWorker ? "emerald" : "primary"}
          loading={loading}
          disabled={expired}
          iconRight={<ArrowRightIcon className="h-5 w-5" />}
        >
          {loading ? "Verifying..." : "Verify and create account"}
        </Button>
      </form>

      <div className="mt-6 border-t border-line-soft pt-5 text-center">
        <p className="text-sm text-ink-muted">
          Didn&apos;t get it? Check your spam folder.
        </p>
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
          <Link to={backTo} className="rounded font-semibold text-brand hover:text-brand-dark focus-ring">
            Go back and re-enter it
          </Link>
          .
        </p>
      </div>
    </AuthLayout>
  );
}

export default VerifySignupOtp;
