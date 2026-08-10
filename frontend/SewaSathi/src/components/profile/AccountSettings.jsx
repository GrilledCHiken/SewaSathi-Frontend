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
import { DetailField } from "../detailUi";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { INPUT_BASE } from "../ui/Field";
import EditableCard from "./EditableCard";

/** Matches what the backend accepts for an avatar, so a rejection happens before the upload. */
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ACCENTS = {
  brand: {
    avatar: "bg-brand",
    button: "primary",
    checklist: "brand",
  },
  emerald: {
    avatar: "bg-emerald-600",
    button: "emerald",
    checklist: "emerald",
  },
};

const STATUS_TONES = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
};

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-danger">{message}</p>;
}

/**
 * The part of "My Profile" that is identical for customers, workers, and admins: the photo,
 * the name and number on the account, and the password.
 *
 * A component rather than a page, so the worker's profile screen can stack its professional
 * fields underneath the same account controls instead of splitting across two routes.
 *
 * Each card reads before it writes — see EditableCard. The form state below is live only
 * while a card is open and is reseeded from the session on entry and on cancel.
 */
export default function AccountSettings({ accent = "brand" }) {
  const { user, applyUserUpdate, logoutCustomer } = useAuth();
  const navigate = useNavigate();
  const theme = ACCENTS[accent] ?? ACCENTS.brand;
  // Shared with every other form in the app; see ui/Field.jsx.
  const inputClassName = `${INPUT_BASE} px-4 py-3`;

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

  /** Refills the details form from the session — on the way into edit mode, and on cancel. */
  const resetDetails = () => {
    setDetails({
      fullName: user?.fullName || user?.name || "",
      phone: user?.phone || "",
    });
    setDetailErrors({});
  };

  const saveDetails = async () => {
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
    // Staying open keeps the errors that were just rendered in front of the person fixing them.
    if (Object.keys(errors).length > 0) return false;

    setSavingDetails(true);
    try {
      applyUserUpdate(await updateMyProfile({ fullName, phone: details.phone }));
      toast.success("Profile details saved.");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save your details.");
      return false;
    } finally {
      setSavingDetails(false);
    }
  };

  const resetPasswords = () => {
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordErrors({});
  };

  const savePassword = async () => {
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
    if (Object.keys(errors).length > 0) return false;

    setSavingPassword(true);
    try {
      await changeMyPassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      // The server revoked every refresh token, this device's included, so the stored
      // tokens are already dead.
      toast.success("Password changed. Please sign in again.");
      await logoutCustomer();
      navigate("/login", { replace: true });
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change your password.");
      setSavingPassword(false);
      return false;
    }
  };

  const initials = user?.initials || "";
  const statusTone = STATUS_TONES[user?.status] ?? "neutral";
  const roleLabel =
    user?.role === "CUSTOMER" ? "Customer" : user?.role === "WORKER" ? "Worker" : "Admin";

  const avatar = (
    <Avatar
      storedUrl={user?.avatarUrl}
      initials={initials}
      className="h-20 w-20 text-xl"
      fallbackClassName={theme.avatar}
      alt="Your profile photo"
    />
  );

  const emailNote = (
    <p className="mt-1.5 text-xs text-ink-muted">
      Your email is how you sign in, so it cannot be changed here. Contact support if you need
      it updated.
    </p>
  );

  return (
    <div className="space-y-4">
      <EditableCard
        title="Profile photo"
        description="Shown next to your name across SewaSathi. JPEG, PNG, GIF, or WebP, up to 5 MB."
        accent={accent}
        editLabel={user?.avatarUrl ? "Change" : "Add photo"}
        view={
          <div className="flex flex-wrap items-center gap-5">
            {avatar}
            <p className="text-sm text-ink-muted">
              {user?.avatarUrl
                ? "This is the photo people see when they work with you."
                : "No photo uploaded yet — your initials are shown instead."}
            </p>
          </div>
        }
      >
        {/* No `onSave`: picking a file uploads it straight away, so this card's footer is a
            Done button rather than Cancel/Save. */}
        <div className="flex flex-wrap items-center gap-5">
          {avatar}

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handlePhotoPicked}
              className="hidden"
            />
            <Button
              variant={theme.button}
              onClick={() => fileInputRef.current?.click()}
              loading={photoBusy}
            >
              {photoBusy ? "Working…" : user?.avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {user?.avatarUrl && (
              <Button variant="secondary" onClick={handlePhotoRemove} disabled={photoBusy}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </EditableCard>

      <EditableCard
        title="Account details"
        description="Your name and number as they appear to everyone you work with."
        accent={accent}
        onOpen={resetDetails}
        onCancel={resetDetails}
        onSave={saveDetails}
        saving={savingDetails}
        saveLabel={savingDetails ? "Saving…" : "Save changes"}
        view={
          <>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField
                label="Full name"
                value={user?.fullName || user?.name}
                empty="Not set"
              />
              <DetailField label="Mobile number" value={user?.phone} empty="Not set" />
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Email
                </dt>
                <dd className="mt-0.5 text-sm text-ink-body">
                  {user?.email || "—"}
                  {emailNote}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-5">
              <Badge tone="neutral" size="md">
                {roleLabel}
              </Badge>
              {user?.status && (
                <Badge tone={statusTone} size="md">
                  {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
                </Badge>
              )}
            </div>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="profileFullName" className="mb-1.5 block text-sm font-semibold text-ink">
              Full name
            </label>
            <input
              id="profileFullName"
              type="text"
              value={details.fullName}
              onChange={(e) => setDetails((d) => ({ ...d, fullName: e.target.value }))}
              maxLength={MAX_FULL_NAME_LENGTH}
              autoComplete="name"
              aria-invalid={Boolean(detailErrors.fullName)}
              className={inputClassName}
            />
            <FieldError message={detailErrors.fullName} />
          </div>

          <div>
            <label htmlFor="profilePhone" className="mb-1.5 block text-sm font-semibold text-ink">
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
              aria-invalid={Boolean(detailErrors.phone)}
              className={inputClassName}
            />
            <FieldError message={detailErrors.phone} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profileEmail" className="mb-1.5 block text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="profileEmail"
              type="email"
              value={user?.email || ""}
              readOnly
              disabled
              className={`${inputClassName} cursor-not-allowed`}
            />
            {emailNote}
          </div>
        </div>
      </EditableCard>

      <EditableCard
        title="Password"
        description="Changing your password signs you out on every device, including this one."
        accent={accent}
        editLabel="Change password"
        saveLabel={savingPassword ? "Changing…" : "Change password"}
        onOpen={resetPasswords}
        onCancel={resetPasswords}
        onSave={savePassword}
        saving={savingPassword}
        view={
          <p className="text-sm text-ink-muted">
            Your password is hidden. You will need your current one to set a new one.
          </p>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-semibold text-ink">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              autoComplete="current-password"
              aria-invalid={Boolean(passwordErrors.currentPassword)}
              className={inputClassName}
            />
            <FieldError message={passwordErrors.currentPassword} />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-semibold text-ink">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              autoComplete="new-password"
              aria-invalid={Boolean(passwordErrors.newPassword)}
              className={inputClassName}
            />
            <FieldError message={passwordErrors.newPassword} />
          </div>

          <div>
            <label
              htmlFor="confirmNewPassword"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Confirm new password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
              autoComplete="new-password"
              aria-invalid={Boolean(passwordErrors.confirmPassword)}
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
      </EditableCard>
    </div>
  );
}
