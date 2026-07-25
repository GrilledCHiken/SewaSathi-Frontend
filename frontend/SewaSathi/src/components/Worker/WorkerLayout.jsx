import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import WorkerSidebar from "./WorkerSidebar";
import { useAuth } from "../../context/AuthContext";

const STATUS_MESSAGES = {
  PENDING: {
    tone: "bg-amber-50 text-amber-800",
    text: "Your worker account is still under review. We'll notify you once an admin approves it.",
  },
  REJECTED: {
    tone: "bg-red-50 text-red-700",
    text: "Your worker application wasn't approved. Contact support for details.",
  },
};

function WorkerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logoutCustomer } = useAuth();

  if (user && user.status !== "APPROVED") {
    const message = STATUS_MESSAGES[user.status] || STATUS_MESSAGES.PENDING;
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
        <div className={`max-w-md rounded-2xl px-6 py-8 text-sm font-medium ${message.tone}`}>
          {message.text}
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
            onClick={() => {
              logoutCustomer();
            }}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh bg-slate-50">
      <WorkerSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <Outlet context={{ openMobileMenu: () => setMobileOpen(true) }} />
      </div>
    </div>
  );
}

export default WorkerLayout;
