import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import AccountSettings from "../../components/profile/AccountSettings";
import EditableCard from "../../components/profile/EditableCard";
import ProfileSummaryCard from "../../components/profile/ProfileSummaryCard";
import WorkerDocumentsCard from "../../components/profile/WorkerDocumentsCard";
import { DetailField } from "../../components/detailUi";
import Alert from "../../components/ui/Alert";
import PageShell, { PageHeader } from "../../components/ui/PageShell";
import StatTile from "../../components/ui/StatTile";
import { CharCount, Field, Input, Select, Textarea } from "../../components/ui/Field";
import { getMyWorkerProfile, updateMyWorkerProfile } from "../../api/workerProfileApi";
import {
  SKILL_OPTIONS,
  LOCATION_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "../../constants/workerOptions";
import { daysUntil, formatDate } from "../../utils/dates";
import { formatRating } from "../../utils/formatStats";

const MAX_BIO_LENGTH = 500;

/** A `span`, not a `div`: this renders inside StatTile's `hint`, which is a paragraph. */
function StarDisplay({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "text-amber-400" : "text-line"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * The banner for the six-month police clearance rule.
 *
 * Expiry warns rather than blocks — an expired report does not stop a worker being hired — so
 * this has to be visible without scrolling to the documents card at the bottom of the page.
 */
function ClearanceNotice({ profile }) {
  const status = profile?.policeClearanceStatus;
  if (status !== "EXPIRED" && status !== "EXPIRING_SOON") return null;

  const remaining = daysUntil(profile.policeClearanceExpiresAt);
  const expiredOn = formatDate(profile.policeClearanceExpiresAt);

  return (
    <Alert
      tone={status === "EXPIRED" ? "danger" : "warning"}
      title={
        status === "EXPIRED"
          ? "Your police clearance report has expired"
          : `Your police clearance report expires in ${remaining <= 1 ? "a day" : `${remaining} days`}`
      }
      role="status"
    >
      {status === "EXPIRED"
        ? `It was only valid until ${expiredOn}. Upload a fresh report below — you can keep working while an admin reviews it.`
        : `It is valid until ${expiredOn}. Upload a fresh one below so there is no gap in your verification.`}
    </Alert>
  );
}

export default function WorkerProfileEdit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [bio, setBio] = useState("");

  /** Fills the form from a profile payload — used on load and after every write. */
  const applyProfile = (loaded) => {
    setProfile(loaded);
    setSelectedSkills(
      loaded.skills ? loaded.skills.split(",").map((s) => s.trim()).filter(Boolean) : []
    );
    setHourlyRate(loaded.hourlyRate != null ? String(loaded.hourlyRate) : "");
    setLocation(loaded.location || "");
    setAddress(loaded.address || "");
    setYearsOfExperience(loaded.yearsOfExperience || "");
    setBio(loaded.bio || "");
  };

  useEffect(() => {
    getMyWorkerProfile()
      .then(applyProfile)
      .catch(() => toast.error("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  /** Discards whatever is in the form and puts the saved profile back. */
  const resetWorkDetails = () => {
    if (profile) applyProfile(profile);
  };

  const saveWorkDetails = async () => {
    setSaving(true);
    try {
      // Every field goes on every save: the server replaces the profile with what it is sent,
      // so anything left out of the body would be cleared.
      applyProfile(
        await updateMyWorkerProfile({
          skills: selectedSkills.join(", "),
          hourlyRate: hourlyRate.trim() ? Number(hourlyRate) : null,
          location: location || null,
          address: address.trim() || null,
          yearsOfExperience: yearsOfExperience || null,
          bio: bio.trim() || null,
        })
      );
      toast.success("Profile updated!");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update your profile.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const ratingAverage = Number(profile?.ratingAverage) || 0;
  const ratingCount = profile?.ratingCount || 0;

  // Read from the saved profile, never the form: an abandoned edit must not leave the tiles
  // and the summary showing numbers that were never sent.
  const savedSkills = profile?.skills
    ? profile.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <PageShell width="md" header={<WorkerHeader title="My Profile" />}>
      <PageHeader
        title="My Profile"
        description="This is what customers see when they browse workers. Keep it up to date to get hired more often."
      />

      <div className="mt-6 space-y-4">
        <ClearanceNotice profile={profile} />

        <ProfileSummaryCard accent="emerald" />

        {loading ? (
          <p className="text-sm text-ink-muted">Loading your profile...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label={
                  ratingCount
                    ? `Rating · ${ratingCount} review${ratingCount !== 1 ? "s" : ""}`
                    : "Rating"
                }
                value={ratingCount ? formatRating(ratingAverage) : "—"}
                hint={<StarDisplay rating={ratingAverage} />}
                tone="warning"
              />
              <StatTile
                label="Tasks completed"
                value={profile?.tasksCompleted ?? 0}
                tone="success"
                to="/worker/jobs"
              />
              <StatTile
                label="Per hour"
                value={profile?.hourlyRate != null ? `NPR ${profile.hourlyRate}` : "—"}
                tone="brand"
              />
              <StatTile
                label="Experience"
                value={profile?.yearsOfExperience || "—"}
                tone="neutral"
              />
            </div>

            {/* Photo, name, number, password — identical for every role, so shared with the
                customer and admin profile screens rather than duplicated here. */}
            <AccountSettings accent="emerald" />

            <EditableCard
              title="Work details"
              description="What you do, where you do it, and what you charge."
              accent="emerald"
              onOpen={resetWorkDetails}
              onCancel={resetWorkDetails}
              onSave={saveWorkDetails}
              saving={saving}
              saveLabel={saving ? "Saving…" : "Save Profile"}
              view={
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Skills
                    </dt>
                    <dd className="mt-1.5">
                      {savedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {savedSkills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 text-sm font-medium text-emerald-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm italic text-ink-faint">
                          No skills selected yet
                        </span>
                      )}
                    </dd>
                  </div>

                  <DetailField
                    label="Hourly rate"
                    value={profile?.hourlyRate != null ? `NPR ${profile.hourlyRate}` : ""}
                    empty="Not set"
                  />
                  <DetailField label="Service area" value={profile?.location} empty="Not set" />
                  <DetailField label="Address" value={profile?.address} empty="Not set" />
                  <DetailField
                    label="Years of experience"
                    value={profile?.yearsOfExperience}
                    empty="Not set"
                  />

                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Bio
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink-body">
                      {profile?.bio || (
                        <span className="italic text-ink-faint">
                          Not written yet — customers read this before they hire.
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              }
            >
              <div>
                <span className="mb-2 block text-sm font-semibold text-ink">Skills</span>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map((skill) => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={[
                          "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                          selected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-line bg-surface-sunken text-ink-body hover:border-ink-faint hover:bg-surface",
                        ].join(" ")}
                        aria-pressed={selected}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field id="hourlyRate" label="Hourly Rate (NPR)">
                  <Input
                    id="hourlyRate"
                    type="text"
                    inputMode="numeric"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="e.g., 300"
                  />
                </Field>

                <Field id="location" label="Service Area">
                  <Select
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    <option value="">Select a city...</option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  id="address"
                  label="Address"
                  hint="Your street or neighbourhood, so customers nearby can find you."
                >
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={255}
                    placeholder="e.g., Baluwatar, Ward 4"
                  />
                </Field>

                <Field id="yearsOfExperience" label="Years of experience">
                  <Select
                    id="yearsOfExperience"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                  >
                    <option value="">Select experience...</option>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                id="bio"
                label="Bio"
                className="mt-6"
                labelSuffix={<CharCount value={bio} max={MAX_BIO_LENGTH} />}
              >
                <Textarea
                  id="bio"
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                  placeholder="Tell customers about your experience, tools, and what makes you reliable."
                />
              </Field>
            </EditableCard>

            <WorkerDocumentsCard profile={profile} onUpdated={applyProfile} />
          </>
        )}
      </div>
    </PageShell>
  );
}
