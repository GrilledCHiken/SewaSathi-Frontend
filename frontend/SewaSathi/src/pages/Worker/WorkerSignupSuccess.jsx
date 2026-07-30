import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthLayout, { AuthFooterLink } from "../../components/auth/AuthLayout";
import WorkerAside from "../../components/auth/WorkerAside";
import Button from "../../components/ui/Button";
import { ArrowRightIcon, CheckIcon } from "../../components/ui/icons";

/**
 * The end of worker signup, at /signup/worker/success.
 *
 * The applicant is still signed in when they arrive — WorkerVerifyStep needed
 * the session to post their documents — so this screen signs them out, which is
 * what makes "sign in below" true. The route is public, so clearing the session
 * here redirects nobody.
 */
export default function WorkerSignupSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutCustomer } = useAuth();

  // Captured once on mount, as on the login screen: router state survives a
  // refresh, so reading it every render would keep re-showing a stale success.
  const [entry] = useState(() =>
    location.state?.fromVerification ? location.state : null,
  );

  useEffect(() => {
    if (!entry) return;
    window.history.replaceState({}, "");
    logoutCustomer();
  }, [entry, logoutCustomer]);

  if (!entry) {
    return <Navigate to="/" replace />;
  }

  const goToLogin = () =>
    navigate("/login", {
      state: { registered: true, email: entry.email, role: "WORKER" },
    });

  return (
    <AuthLayout
      width="max-w-md"
      aside={<WorkerAside />}
      title="Account created successfully!"
      subtitle={
        entry.submitted
          ? "Sign in below to get started. Your worker application will be reviewed by an administrator."
          : "Sign in below to get started. You can finish your verification any time from your worker dashboard."
      }
      topBar={
        <div className="flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-success/10">
            <CheckIcon className="h-8 w-8" />
          </span>
        </div>
      }
      footer={<AuthFooterLink prompt="Wrong account?" to="/signup" label="Start over" />}
    >
      {entry.submitted && (
        <ol className="mt-6 space-y-3 rounded-card border border-line bg-surface-sunken/60 p-4">
          {[
            "We check your documents — usually within 24 hours.",
            "You'll be notified as soon as a decision is made.",
            "Once approved, jobs in your area open up straight away.",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-sm text-ink-body">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      <Button
        size="lg"
        shape="rounded"
        fullWidth
        className="mt-6"
        onClick={goToLogin}
        iconRight={<ArrowRightIcon className="h-5 w-5" />}
      >
        Sign in
      </Button>

      <p className="mt-4 text-center text-sm">
        <Link
          to="/"
          className="rounded font-semibold text-ink-muted transition hover:text-ink-body focus-ring"
        >
          Back to home
        </Link>
      </p>
    </AuthLayout>
  );
}
