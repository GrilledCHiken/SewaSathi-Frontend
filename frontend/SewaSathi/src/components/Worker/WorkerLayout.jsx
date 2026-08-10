import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import WorkerSidebar from "./WorkerSidebar";
import WorkerVerification from "../../pages/Worker/WorkerVerification";
import { useAuth } from "../../context/AuthContext";
import { ChatProvider } from "../../context/ChatContext";
import { getMyWorkerProfile } from "../../api/workerProfileApi";
import useConfirm from "../../hooks/useConfirm";
import { signOutConfirm } from "../../utils/confirmMessages";

const STATUS_MESSAGES = {
  PENDING: {
    tone: "bg-amber-50 text-amber-800",
    text: "Your verification has been submitted and is under review. We'll notify you once an admin approves it.",
  },
  REJECTED: {
    tone: "bg-red-50 text-red-700",
    text: "Your worker application wasn't approved. Contact support for details.",
  },
};

/**
 * The admin's own words, when there are any. Accounts rejected before the reason became
 * mandatory have none, and fall back to the generic line above.
 */
const rejectionLead = "Your worker application wasn't approved.";

function WorkerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const { user, logoutCustomer } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const needsProfileCheck = user?.status === "PENDING";

  const handleSignOut = async () => {
    if (await confirm(signOutConfirm())) logoutCustomer();
  };

  useEffect(() => {
    if (needsProfileCheck) {
      getMyWorkerProfile()
        .then(setProfile)
        .catch(() => toast.error("Could not load your verification status."))
        .finally(() => setProfileChecked(true));
    }
  }, [needsProfileCheck]);

  if (user && user.status !== "APPROVED") {
    if (user.status === "PENDING" && !profileChecked) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      );
    }

    if (user.status === "PENDING" && !profile?.verificationSubmittedAt) {
      // The safety net for anyone who skipped or abandoned step 2 of signup.
      return <WorkerVerification mode="gate" profile={profile} onSubmitted={setProfile} />;
    }

    const message = STATUS_MESSAGES[user.status] || STATUS_MESSAGES.PENDING;
    const reason = user.status === "REJECTED" ? user.rejectionReason?.trim() : null;
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
        <div className={`max-w-md rounded-2xl px-6 py-8 text-sm font-medium ${message.tone}`}>
          {reason ? (
            <>
              <p>{rejectionLead}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-70">
                Reason given
              </p>
              {/* The admin typed this; whitespace is preserved so line breaks survive. */}
              <p className="mt-1 whitespace-pre-line font-normal">{reason}</p>
            </>
          ) : (
            message.text
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Home
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Sign Out
          </button>
        </div>

        {confirmDialog}
      </div>
    );
  }

  // Only reached once the worker is APPROVED — the unapproved branches above return early,
  // and a worker who cannot take jobs has no conversations to connect for.
  return (
    <ChatProvider>
      <div className="flex min-h-svh bg-surface-muted">
        <WorkerSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
          <Outlet context={{ openMobileMenu: () => setMobileOpen(true) }} />
        </div>
      </div>
    </ChatProvider>
  );
}

export default WorkerLayout;
