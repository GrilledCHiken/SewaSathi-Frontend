import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import {
  changeMyPassword,
  removeMyAvatar,
  updateMyProfile,
  uploadMyAvatar,
} from "../../api/userApi";
import {
  MAX_FULL_NAME_LENGTH,
  NEPAL_MOBILE_REGEX,
  isPasswordStrong,
  sanitizePhone,
} from "../../utils/validation";
import Avatar from "../Avatar";
import PasswordChecklist from "../PasswordChecklist";

/** Matches what the backend accepts for an avatar, so a rejection happens before the upload. */
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ACCENTS = {
  brand: {
    avatar: "bg-brand",
    button: "bg-brand hover:bg-brand-dark",
    ring: "focus:border-brand focus:ring-brand/20",
    checklist: "brand",
  },
  emerald: {
    avatar: "bg-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700",
    ring: "focus:border-emerald-600 focus:ring-emerald-600/20",
    checklist: "emerald",
  },
};

const STATUS_STYLES = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>;
}

/**
 * The part of "My Profile" that is identical for customers, workers, and admins: the photo,
 * the name and number on the account, and the password.
 *
 * Kept as a component rather than a page so the worker's profile screen can stack its
 * professional fields (skills, rate, service area) underneath the same account controls
 * instead of splitting a worker's identity across two routes.
 */
export default function AccountSettings({ accent = "brand" }) {
  const { user, applyUserUpdate, logoutCustomer } = useAuth();
  const navigate = useNavigate();
  const theme = ACCENTS[accent] ?? ACCENTS.brand;
  const inputClassName = `w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${theme.ring}`;

  const fileInputRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [details, setDetails] = useState({
    fullName: user?.fullName || user?.name || "",
    phone: user?.phone || "",
  });
  const [detailErrors, setDetailErrors] = useState({});
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePhotoPicked = async (e) => {
    const file = e.target.files?.[0];
    // Clearing the input lets the same file be picked again after a failure.
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Choose a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("That image is larger than 5 MB. Please pick a smaller one.");
      return;
    }

    setPhotoBusy(true);
    try {
      applyUserUpdate(await uploadMyAvatar(file));
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not upload that photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoBusy(true);
    try {
      applyUserUpdate(await removeMyAvatar());
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove your photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();

    const fullName = details.fullName.trim();
    const errors = {};
    if (fullName.length < 2) {
      errors.fullName = "Please enter your full name.";
    } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
      errors.fullName = `Full name cannot be longer than ${MAX_FULL_NAME_LENGTH} characters.`;
    }
    if (!NEPAL_MOBILE_REGEX.test(details.phone)) {
      errors.phone = "Enter a valid 10-digit mobile number starting with 97 or 98.";
    }
    setDetailErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingDetails(true);
    try {
      applyUserUpdate(await updateMyProfile({ fullName, phone: details.phone }));
      toast.success("Profile details saved.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save your details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!passwords.currentPassword) {
      errors.currentPassword = "Enter your current password.";
    }
    if (!isPasswordStrong(passwords.newPassword)) {
      errors.newPassword = "Password does not meet all the requirements below.";
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    try {
      await changeMyPassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      // The server revoked every refresh token, this device's included, so the tokens in
      // storage are already dead. Clearing them locally keeps the app from making requests
      // it cannot recover from on the way to the sign-in page.
      toast.success("Password changed. Please sign in again.");
      await logoutCustomer();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change your password.");
      setSavingPassword(false);
    }
  };

  const initials = user?.initials || "";
  const statusStyle = STATUS_STYLES[user?.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-4">
      <Card
        title="Profile photo"
        description="Shown next to your name across SewaSathi. JPEG, PNG, GIF, or WebP, up to 5 MB."
      >
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            storedUrl={user?.avatarUrl}
            initials={initials}
            className="h-20 w-20 text-xl"
            fallbackClassName={theme.avatar}
            alt="Your profile photo"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handlePhotoPicked}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoBusy}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
            >
              {photoBusy ? "Working…" : user?.avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {user?.avatarUrl && (
              <button
                type="button"
                onClick={handlePhotoRemove}
                disabled={photoBusy}
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Account details" description="Your name and number as they appear to everyone you work with.">
        <form onSubmit={handleDetailsSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="profileFullName" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Full name
              </label>
              <input
                id="profileFullName"
                type="text"
                value={details.fullName}
                onChange={(e) => setDetails((d) => ({ ...d, fullName: e.target.value }))}
                maxLength={MAX_FULL_NAME_LENGTH}
                autoComplete="name"
                className={inputClassName}
              />
              <FieldError message={detailErrors.fullName} />
            </div>

            <div>
              <label htmlFor="profilePhone" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Mobile number
              </label>
              <input
                id="profilePhone"
                type="tel"
                inputMode="numeric"
                value={details.phone}
                onChange={(e) => setDetails((d) => ({ ...d, phone: sanitizePhone(e.target.value) }))}
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                className={inputClassName}
              />
              <FieldError message={detailErrors.phone} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="profileEmail" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="profileEmail"
                type="email"
                value={user?.email || ""}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Your email is how you sign in, so it cannot be changed here. Contact support if
                you need it updated.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {user?.role === "CUSTOMER" ? "Customer" : user?.role === "WORKER" ? "Worker" : "Admin"}
            </span>
            {user?.status && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>
                {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
              </span>
            )}

            <button
              type="submit"
              disabled={savingDetails}
              className={`ml-auto rounded-full px-8 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
            >
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Password"
        description="Changing your password signs you out on every device, including this one."
      >
        <form onSubmit={handlePasswordSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
                className={inputClassName}
              />
              <FieldError message={passwordErrors.currentPassword} />
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-semibold text-slate-800">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
                className={inputClassName}
              />
              <FieldError message={passwordErrors.newPassword} />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Confirm new password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                autoComplete="new-password"
                className={inputClassName}
              />
              <FieldError message={passwordErrors.confirmPassword} />
            </div>
          </div>

          <PasswordChecklist
            value={passwords.newPassword}
            accent={theme.checklist}
            show={passwords.newPassword.length > 0}
          />

          <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={savingPassword}
              className={`rounded-full px-8 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
            >
              {savingPassword ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
