import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { getMyWorkerProfile } from "../../api/workerProfileApi";
import { LoadingBlock } from "../../components/ui/Spinner";
import WorkerVerification from "./WorkerVerification";

/**
 * Step 2 of worker signup, at /signup/worker/verify.
 *
 * WorkerSignup logs the new account in before routing here, because the
 * verification endpoint is authenticated — see the note in AuthContext about
 * registration deliberately returning no token.
 *
 * Sign-out happens on the success screen, not here: clearing the session while
 * still inside ProtectedRoute would bounce the applicant to /login before they
 * ever saw the confirmation.
 */
export default function WorkerVerifyStep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getMyWorkerProfile()
      .then(setProfile)
      .catch(() => toast.error("Could not load your profile. You can still fill this in."))
      .finally(() => setChecked(true));
  }, []);

  const finish = (submitted) =>
    navigate("/signup/worker/success", {
      replace: true,
      state: { fromVerification: true, email: user?.email, submitted },
    });

  if (!checked) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface-muted">
        <LoadingBlock label="Setting up your application…" />
      </div>
    );
  }

  // Already filed — an admin has it, so don't invite a second submission.
  if (profile?.verificationSubmittedAt) {
    return <Navigate to="/worker" replace />;
  }

  return (
    <WorkerVerification
      mode="signup"
      profile={profile}
      onSubmitted={() => finish(true)}
      onSkip={() => finish(false)}
    />
  );
}
