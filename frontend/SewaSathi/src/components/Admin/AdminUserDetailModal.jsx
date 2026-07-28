import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";
import { DetailField, DocumentLink } from "./detailUi";
import { initialsOf } from "../tasks/taskUi";
import { getUser } from "../../api/adminApi";

const STATUS_STYLES = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function splitSkills(skills) {
  return (skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

/**
 * The full record behind a row in User Management.
 *
 * The list endpoint deliberately returns only the columns the table shows, so the details —
 * and, for a worker, the profile and verification documents — are fetched per user when the
 * modal opens. Its overlay and keyboard behaviour follow DocumentViewerModal, which is the
 * established dialog shape in this codebase.
 */
export default function AdminUserDetailModal({ userId, onClose }) {
  const [state, setState] = useState({ id: userId, user: null, failed: false });
  const closeButtonRef = useRef(null);
  // A document viewer opens on top of this dialog and runs its own Escape handler. Without
  // standing down, one keypress would close both and drop the admin back to the table.
  const [documentOpen, setDocumentOpen] = useState(false);

  // Prop-derived state, reset during render — the same pattern Avatar and DocumentViewerModal
  // use, so reopening on a different row never shows the previous person for a frame.
  if (state.id !== userId) {
    setState({ id: userId, user: null, failed: false });
  }

  useEffect(() => {
    let cancelled = false;

    getUser(userId)
      .then((user) => {
        if (!cancelled) setState({ id: userId, user, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ id: userId, user: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (documentOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, documentOpen]);

  // Focus moves to the dialog on open only; callers pass an inline onClose, so folding this
  // into the effect above would pull focus back every render.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleDocumentOpenChange = useCallback((open) => setDocumentOpen(open), []);

  const { user, failed } = state;
  const profile = user?.workerProfile;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={user ? `${user.fullName} account details` : "Account details"}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                storedUrl={user.avatarUrl}
                initials={initialsOf(user.fullName)}
                className="h-12 w-12 text-base"
              />
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-900">{user.fullName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {user.role}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_STYLES[user.status] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-base font-bold text-slate-900">Account details</h2>
          )}

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {failed && <p className="text-sm text-slate-500">Could not load that account.</p>}

          {!failed && !user && (
            <div className="space-y-3" aria-hidden="true">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
            </div>
          )}

          {user && (
            <>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <DetailField label="Email" value={user.email} />
                <DetailField label="Phone" value={user.phone} />
                <DetailField label="Joined" value={formatDate(user.createdAt)} />
                <DetailField label="Account" value={user.suspended ? "Suspended" : "Active"} />
              </dl>

              {profile && (
                <>
                  <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                    <DetailField label="City" value={profile.location} />
                    <DetailField label="Address" value={profile.address} />
                    <DetailField label="Experience" value={profile.yearsOfExperience} />
                    <DetailField
                      label="Hourly rate"
                      value={profile.hourlyRate != null ? `NPR ${profile.hourlyRate}/hr` : null}
                    />
                    <DetailField
                      label="Rating"
                      value={
                        profile.ratingCount
                          ? `${profile.ratingAverage} (${profile.ratingCount})`
                          : "No ratings yet"
                      }
                    />
                    <DetailField label="Tasks completed" value={profile.tasksCompleted} />
                    <DetailField
                      label="Verification submitted"
                      value={formatDate(profile.verificationSubmittedAt)}
                    />
                  </dl>

                  {splitSkills(profile.skills).length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Skills
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {splitSkills(profile.skills).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.bio && (
                    <div className="mt-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Bio
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{profile.bio}</p>
                    </div>
                  )}

                  {(profile.policeClearanceUrl ||
                    profile.citizenshipDocUrl ||
                    profile.profilePhotoUrl) && (
                    <div className="mt-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Documents
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4">
                        <DocumentLink
                          url={profile.policeClearanceUrl}
                          name="Police Clearance Report"
                          onOpenChange={handleDocumentOpenChange}
                        />
                        <DocumentLink
                          url={profile.citizenshipDocUrl}
                          name="Citizenship / ID"
                          onOpenChange={handleDocumentOpenChange}
                        />
                        <DocumentLink
                          url={profile.profilePhotoUrl}
                          name="Profile Photo"
                          onOpenChange={handleDocumentOpenChange}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
