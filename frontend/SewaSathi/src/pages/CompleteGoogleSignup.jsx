import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import AuthLayout, { AuthFooterLink } from "../components/auth/AuthLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { ArrowLeftIcon, ArrowRightIcon, PhoneIcon } from "../components/ui/icons";
import { routeForRole } from "../utils/authRouting";
import { takeGoogleCredential } from "../utils/signupHandoff";
import { NEPAL_MOBILE_REGEX, sanitizePhone } from "../utils/validation";

/**
 * The one thing Google cannot tell us.
 *
 * Reached only when /api/auth/google verified an identity that has no account here yet. No
 * account exists at this point — it is created when this form is submitted, by re-posting the
 * same credential with the phone number attached.
 */
function CompleteGoogleSignup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const details = location.state;
  // Read once, on mount: the credential is taken out of the in-memory stash and taking it
  // twice would yield null on the second render.
  const [credential] = useState(() => takeGoogleCredential());

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // No credential means a refresh (the stash is memory-only) or a direct visit. Neither can
  // finish, and Google's button is one click away.
  if (!credential || !details?.email) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    setPhone(sanitizePhone(e.target.value));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!NEPAL_MOBILE_REGEX.test(phone)) {
      setError("Enter a valid 10-digit mobile number starting with 97 or 98.");
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithGoogle({ credential, phone });
      toast.success("Welcome to SewaSathi!");
      navigate(routeForRole(result.user), { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ?? "Could not finish creating your account. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="One more thing"
      subtitle="We just need a phone number so the workers you book can reach you."
      topBar={
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-field px-1 py-0.5 text-sm font-medium text-ink-faint transition hover:text-ink-body focus-ring"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Link>
        </div>
      }
      notice={
        <Alert tone="info" title="Creating a customer account">
          Signing up with Google gives you a customer account. To offer services instead,{" "}
          <Link to="/signup/worker" className="font-semibold underline">
            register as a worker
          </Link>
          .
        </Alert>
      }
      footer={<AuthFooterLink prompt="Already have an account?" to="/login" label="Log in" />}
    >
      {/* Which Google account this is. A browser signed into several can hand back one the
          user did not mean to use, and there is no other point at which they would notice. */}
      <div className="mt-7 flex items-center gap-3 rounded-card border border-line bg-surface-muted p-4">
        {details.avatarUrl ? (
          <img
            src={details.avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
            {(details.fullName || details.email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{details.fullName}</p>
          <p className="truncate text-sm text-ink-muted">{details.email}</p>
        </div>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
        <Field id="phone" label="Phone Number" error={error}>
          {(field) => (
            <Input
              {...field}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handleChange}
              placeholder="98XXXXXXXX"
              autoComplete="tel"
              maxLength={10}
              autoFocus
              required
              leadingIcon={<PhoneIcon className="h-5 w-5" />}
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
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default CompleteGoogleSignup;
