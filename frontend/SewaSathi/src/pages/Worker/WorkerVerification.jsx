import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { submitWorkerVerification } from "../../api/workerProfileApi";
import { SKILL_OPTIONS, LOCATION_OPTIONS, EXPERIENCE_OPTIONS } from "../../constants/workerOptions";
const MAX_BIO_LENGTH = 500;

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function UploadIcon() {
  return (
    <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v12" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function FileDropzone({ label, required, file, onChange, accept = "application/pdf,image/*" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center transition hover:border-brand hover:bg-brand/5">
        <UploadIcon />
        <span className="text-xs font-medium text-slate-600">
          {file ? file.name : "Click to upload PDF or image"}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}

export default function WorkerVerification({ profile, onSubmitted }) {
  const { user } = useAuth();
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

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !city || !address.trim()) {
      toast.error("Please fill in all required personal information fields.");
      return;
    }
    if (!policeClearance) {
      toast.error("A police clearance report is required for verification.");
      return;
    }
    if (!citizenshipDoc) {
      toast.error("A citizenship/ID document is required for verification.");
      return;
    }
    if (selectedSkills.length === 0) {
      toast.error("Please select at least one skill.");
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
      toast.success("Verification submitted! Our team reviews every application within 24 hours.");
      onSubmitted?.(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center bg-slate-50 px-4 py-10 sm:py-12">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand text-white">
          <PersonIcon />
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-900">SewaSathi</span>
      </div>

      <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldIcon />
            Verification Required
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Worker Verification
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 sm:text-base">
            Complete the form below to get verified. Our team reviews every application within
            24 hours.
          </p>
        </div>

        <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ram Bahadur"
                  required
                  className={inputClassName}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="city" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className={inputClassName}
                  >
                    <option value="">Select city</option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="address" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Ward, District"
                  required
                  className={inputClassName}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Verification Documents
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileDropzone
                label="Police Clearance Report"
                required
                file={policeClearance}
                onChange={setPoliceClearance}
              />
              <FileDropzone
                label="Citizenship / ID"
                required
                file={citizenshipDoc}
                onChange={setCitizenshipDoc}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">Profile Photo</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center transition hover:border-brand hover:bg-brand/5">
                <PersonIcon />
                <span className="text-xs font-medium text-slate-600">
                  {profilePhoto ? profilePhoto.name : "Upload a clear front-facing photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Skills &amp; Experience
            </h2>

            <span className="mb-2 block text-sm font-semibold text-slate-800">
              Select your skills <span className="text-red-500">*</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const selected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    aria-pressed={selected}
                    className={[
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                      selected
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                    ].join(" ")}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="experience" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Years of Experience
                </label>
                <select
                  id="experience"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Select</option>
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="hourlyRate" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Hourly Rate (NPR)
                </label>
                <input
                  id="hourlyRate"
                  type="text"
                  inputMode="numeric"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g., 500"
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="bio" className="mb-1.5 block text-sm font-semibold text-slate-800">
                About You
              </label>
              <div className="relative">
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                  placeholder="Tell us about your experience and what makes you a great worker..."
                  className={`${inputClassName} resize-y min-h-[100px] pb-8`}
                />
                <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">
                  {bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
            </div>
          </section>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for Verification"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Your documents are securely stored and reviewed by our team. By submitting, you
              agree to our verification process.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
