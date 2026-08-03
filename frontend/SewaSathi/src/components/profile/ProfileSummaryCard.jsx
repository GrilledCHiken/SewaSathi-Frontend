import Avatar from "../Avatar";
import Badge from "../ui/Badge";
import { formatMonthYear } from "../../utils/dates";
import { useAuth } from "../../context/AuthContext";

/**
 * The identity header of "My Profile": who this account is, what it is allowed to do, and how
 * long it has existed.
 *
 * Everything below it on the page is a form. This is the only part that just *states* the
 * account, which is what was missing — the profile screens used to open straight into an edit
 * box, so a customer could not see their role, their standing, or their join date anywhere in
 * the app.
 *
 * Shared by all three roles; `accent` matches the one passed to `AccountSettings` on the same
 * page so the two cards agree.
 */

const ROLE_LABELS = {
  CUSTOMER: "Customer",
  WORKER: "Worker",
  ADMIN: "Administrator",
};

const STATUS_TONES = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

const ACCENT_AVATARS = {
  brand: "bg-brand",
  emerald: "bg-emerald-600",
};

function Detail({ label, value }) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink-body">{value}</dd>
    </div>
  );
}

export default function ProfileSummaryCard({ accent = "brand", children }) {
  const { user } = useAuth();
  if (!user) return null;

  const memberSince = formatMonthYear(user.createdAt);

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-e1 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          storedUrl={user.avatarUrl}
          initials={user.initials || ""}
          className="h-16 w-16 text-lg"
          fallbackClassName={ACCENT_AVATARS[accent] ?? ACCENT_AVATARS.brand}
          alt="Your profile photo"
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-ink">
            {user.fullName || user.name || "Your account"}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={accent === "emerald" ? "success" : "brand"}>
              {ROLE_LABELS[user.role] || "Member"}
            </Badge>
            {user.status && (
              <Badge tone={STATUS_TONES[user.status] ?? "neutral"} dot>
                {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
              </Badge>
            )}
            {user.suspended && <Badge tone="danger">Suspended</Badge>}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-line-soft pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Email" value={user.email} />
        <Detail label="Mobile" value={user.phone} />
        <Detail label="Member since" value={memberSince} />
        <Detail label="Account ID" value={user.id != null ? `#${user.id}` : null} />
      </dl>

      {children}
    </section>
  );
}
