import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import WorkerHeader from "../../components/Worker/WorkerHeader";
import { getMyWorkerProfile, updateMyWorkerProfile } from "../../api/workerProfileApi";
import { SKILL_OPTIONS, LOCATION_OPTIONS } from "../../constants/workerOptions";

const MAX_BIO_LENGTH = 500;

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "text-amber-400" : "text-slate-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function WorkerProfileEdit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ ratingAverage: 0, ratingCount: 0, tasksCompleted: 0 });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    getMyWorkerProfile()
      .then((profile) => {
        setSelectedSkills(
          profile.skills ? profile.skills.split(",").map((s) => s.trim()).filter(Boolean) : []
        );
        setHourlyRate(profile.hourlyRate != null ? String(profile.hourlyRate) : "");
        setLocation(profile.location || "");
        setBio(profile.bio || "");
        setStats({
          ratingAverage: Number(profile.ratingAverage) || 0,
          ratingCount: profile.ratingCount || 0,
          tasksCompleted: profile.tasksCompleted || 0,
        });
      })
      .catch(() => toast.error("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyWorkerProfile({
        skills: selectedSkills.join(", "),
        hourlyRate: hourlyRate.trim() ? Number(hourlyRate) : null,
        location: location || null,
        bio: bio.trim() || null,
      });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <WorkerHeader title="My Profile" />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Profile</h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              This is what customers see when they browse workers. Keep it up to date to get
              hired more often.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading your profile...</p>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-1.5">
                    <StarDisplay rating={stats.ratingAverage} />
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {stats.ratingAverage.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500">{stats.ratingCount} review{stats.ratingCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm">
                  <p className="text-lg font-bold text-slate-900">{stats.tasksCompleted}</p>
                  <p className="text-xs text-slate-500">Tasks completed</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm">
                  <p className="text-lg font-bold text-slate-900">
                    {hourlyRate ? `NPR ${hourlyRate}` : "—"}
                  </p>
                  <p className="text-xs text-slate-500">Per hour</p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
              >
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Skills
                  </span>
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
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
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
                      placeholder="e.g., 300"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="location" className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Service Area
                    </label>
                    <select
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select a city...</option>
                      {LOCATION_OPTIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="bio" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Bio
                  </label>
                  <div className="relative">
                    <textarea
                      id="bio"
                      rows={5}
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                      placeholder="Tell customers about your experience, tools, and what makes you reliable."
                      className={`${inputClassName} resize-y min-h-[120px] pb-8`}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">
                      {bio.length}/{MAX_BIO_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
