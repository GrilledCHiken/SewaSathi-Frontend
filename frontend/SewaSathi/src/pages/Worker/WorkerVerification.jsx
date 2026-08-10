import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { submitWorkerVerification } from "../../api/workerProfileApi";
import { SKILL_OPTIONS, LOCATION_OPTIONS, EXPERIENCE_OPTIONS } from "../../constants/workerOptions";
import BackLink from "../../components/ui/BackLink";
import Brandmark from "../../components/ui/Brandmark";
import Button from "../../components/ui/Button";
import FileDropzone from "../../components/ui/FileDropzone";
import { CharCount, Field, Input, Select, Textarea } from "../../components/ui/Field";
import { ArrowRightIcon, ShieldIcon } from "../../components/ui/icons";
import WorkerSignupSteps from "../../components/auth/WorkerSignupSteps";
import useConfirm from "../../hooks/useConfirm";
import { cn } from "../../utils/cn";

const MAX_BIO_LENGTH = 500;

/**
 * Worker verification form.
 *
 * Rendered in two places, which is what `mode` distinguishes:
 *
 * - `"signup"` — step 2 of signing up, at /signup/worker/verify. Shows the step
 *   header and lets the applicant defer via `onSkip`.
 * - `"gate"` — the takeover WorkerLayout puts in front of a PENDING worker who
 *   never filed one. No step header, and no way past it but submitting.
 */

function PersonIcon({ className = "h-7 w-7 text-ink-faint" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0" />
    </svg>
  );
}

export default function WorkerVerification({
  profile,
  onSubmitted,
  mode = "gate",
  onSkip,
}) {
  const { user } = useAuth();
  const isSignup = mode === "signup";

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [city, setCity] = useState(profile?.location || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [policeClearance, setPoliceClearance] = useState(null);
  const [citizenshipDoc, setCitizenshipDoc] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState(
    profile?.skills ? profile.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(profile?.yearsOfExperience || "");
  const [hourlyRate, setHourlyRate] = useState(profile?.hourlyRate != null ? String(profile.hourlyRate) : "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirm, confirmDialog] = useConfirm();

  /* Deferring is easy to click past without realising it costs you every job until you
     come back and finish it, so it gets asked about. */
  const handleSkip = async () => {
    const ok = await confirm({
      title: "Skip verification for now?",
      body: "Your account stays pending until this is filed and approved, so you won't be able to take on any jobs. You can come back to it from your dashboard.",
      confirmLabel: "Skip for now",
      cancelLabel: "Finish it now",
      tone: "primary",
    });
    if (ok) onSkip?.();
  };

  /** Setter wrapper that clears the field's error as soon as it's touched. */
  const withClear = (field, set) => (value) => {
    set(value);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
    setErrors((prev) => (prev.skills ? { ...prev, skills: "" } : prev));
  };

  const validate = () => {
    const next = {};
    if (!fullName.trim()) next.fullName = "Enter your full name.";
    if (!phone.trim()) next.phone = "Enter your phone number.";
    if (!city) next.city = "Select your city.";
    if (!address.trim()) next.address = "Enter your full address.";
    if (!policeClearance) next.policeClearance = "A police clearance report is required.";
    if (!citizenshipDoc) next.citizenshipDoc = "A citizenship or ID document is required.";
    if (selectedSkills.length === 0) next.skills = "Select at least one skill.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please complete the highlighted fields.");
      return;
    }

    const formData = new FormData();
    formData.append("fullName", fullName.trim());
    formData.append("phone", phone.trim());
    formData.append("city", city);
    formData.append("address", address.trim());
    formData.append("skills", selectedSkills.join(", "));
    if (yearsOfExperience) formData.append("yearsOfExperience", yearsOfExperience);
    if (hourlyRate.trim()) formData.append("hourlyRate", hourlyRate.trim());
    if (bio.trim()) formData.append("bio", bio.trim());
    formData.append("policeClearance", policeClearance);
    formData.append("citizenshipDoc", citizenshipDoc);
    if (profilePhoto) formData.append("profilePhoto", profilePhoto);

    setSubmitting(true);
    try {
      const updated = await submitWorkerVerification(formData);
      if (!isSignup) {
        // In signup mode the success screen carries the message, so a toast here
        // would only flash past on the way to it.
        toast.success("Verification submitted! Our team reviews every application within 24 hours.");
      }
      onSubmitted?.(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center bg-surface-muted px-4 py-10 sm:py-12">
      <Brandmark to="/" size="sm" className="mb-6" />

      <div className="w-full max-w-2xl animate-fade-up rounded-panel border border-line bg-surface p-6 shadow-e3 sm:p-10">
        {/* Signup only. The "gate" variant is the takeover shown to a PENDING worker
            who never filed a verification, and it deliberately has no way past it
            but submitting — a back button there would just be an exit. */}
        {isSignup && (
          <div className="mb-5">
            <BackLink to="/signup/worker" />
          </div>
        )}

        {isSignup && <WorkerSignupSteps current={2} className="mb-8" />}

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldIcon className="h-3.5 w-3.5" />
            Verification Required
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Worker Verification
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-base">
            Complete the form below to get verified. Our team reviews every application within
            24 hours.
          </p>
        </div>

        <form className="mt-8 space-y-8" onSubmit={handleSubmit} noValidate>
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-muted">
              Personal Information
            </h2>
            <div className="space-y-4">
              <Field id="fullName" label="Full Name" required error={errors.fullName}>
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    value={fullName}
                    onChange={(e) => withClear("fullName", setFullName)(e.target.value)}
                    placeholder="Ram Bahadur"
                    autoComplete="name"
                    maxLength={150}
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="phone" label="Phone Number" required error={errors.phone}>
                  {(field) => (
                    <Input
                      {...field}
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => withClear("phone", setPhone)(e.target.value)}
                      placeholder="98XXXXXXXX"
                      autoComplete="tel"
                      maxLength={10}
                    />
                  )}
                </Field>

                <Field id="city" label="City" required error={errors.city}>
                  {(field) => (
                    <Select
                      {...field}
                      value={city}
                      onChange={(e) => withClear("city", setCity)(e.target.value)}
                    >
                      <option value="">Select city</option>
                      {LOCATION_OPTIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>

              <Field id="address" label="Full Address" required error={errors.address}>
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    value={address}
                    onChange={(e) => withClear("address", setAddress)(e.target.value)}
                    placeholder="Street, Ward, District"
                    autoComplete="street-address"
                  />
                )}
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-muted">
              Verification Documents
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileDropzone
                id="policeClearance"
                label="Police Clearance Report"
                required
                file={policeClearance}
                error={errors.policeClearance}
                onChange={withClear("policeClearance", setPoliceClearance)}
              />
              <FileDropzone
                id="citizenshipDoc"
                label="Citizenship / ID"
                required
                file={citizenshipDoc}
                error={errors.citizenshipDoc}
                onChange={withClear("citizenshipDoc", setCitizenshipDoc)}
              />
            </div>

            <FileDropzone
              id="profilePhoto"
              label="Profile Photo"
              file={profilePhoto}
              onChange={setProfilePhoto}
              accept="image/*"
              icon={<PersonIcon />}
              placeholder="Upload a clear front-facing photo"
              className="mt-4 py-8"
            />
          </section>

          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-muted">
              Skills &amp; Experience
            </h2>

            <span className="mb-2 block text-sm font-semibold text-ink">
              Select your skills
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            </span>
            <div
              role="group"
              aria-label="Skills"
              aria-invalid={errors.skills ? true : undefined}
              aria-describedby={errors.skills ? "skills-error" : undefined}
              className="flex flex-wrap gap-2"
            >
              {SKILL_OPTIONS.map((skill) => {
                const selected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition focus-ring",
                      selected
                        ? "border-brand bg-brand-50 text-brand-700"
                        : "border-line bg-surface-sunken text-ink-body hover:border-line-strong hover:bg-surface",
                    )}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
            {errors.skills && (
              <p id="skills-error" className="mt-1.5 text-sm font-medium text-danger">
                {errors.skills}
              </p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="experience" label="Years of Experience">
                {(field) => (
                  <Select
                    {...field}
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                  >
                    <option value="">Select</option>
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field id="hourlyRate" label="Hourly Rate (NPR)">
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    inputMode="numeric"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="e.g., 500"
                  />
                )}
              </Field>
            </div>

            <Field
              id="bio"
              label="About You"
              className="mt-5"
              labelSuffix={<CharCount value={bio} max={MAX_BIO_LENGTH} />}
            >
              {(field) => (
                <Textarea
                  {...field}
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                  placeholder="Tell us about your experience and what makes you a great worker..."
                />
              )}
            </Field>
          </section>

          <div>
            <Button
              type="submit"
              size="lg"
              shape="rounded"
              fullWidth
              loading={submitting}
              iconRight={<ArrowRightIcon className="h-5 w-5" />}
            >
              {submitting ? "Submitting..." : "Submit for Verification"}
            </Button>

            {isSignup && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="rounded-field px-2 py-1 text-sm font-semibold text-ink-muted transition hover:text-ink-body focus-ring disabled:opacity-60"
                >
                  I&apos;ll do this later
                </button>
              </div>
            )}

            <p className="mt-3 text-center text-xs text-ink-faint">
              Your documents are securely stored and reviewed by our team. By submitting, you
              agree to our verification process.
            </p>
          </div>
        </form>
      </div>

      {confirmDialog}
    </div>
  );
}
