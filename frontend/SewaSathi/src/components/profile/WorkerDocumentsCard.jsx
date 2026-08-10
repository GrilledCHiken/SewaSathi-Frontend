import { useState } from "react";
import { toast } from "react-toastify";
import { DocumentLink } from "../detailUi";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import FileDropzone from "../ui/FileDropzone";
import { downloadFile } from "../../api/fileApi";
import { uploadPoliceClearance } from "../../api/workerProfileApi";
import { daysUntil, formatDate } from "../../utils/dates";

/**
 * A worker's verification documents, on their own profile. Carries the one rule that needs the
 * worker to act — **a police clearance report is only accepted for six months**.
 *
 * A replacement is reviewed before it counts: uploading parks the new file in the profile's
 * pending columns and leaves the worker approved and working, and only an admin approving it
 * swaps the document on record. That is why a row can show a document and a proposed one at
 * the same time.
 */

/** The server's cap on any upload (spring.servlet.multipart.max-file-size). */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = "application/pdf,image/*";

function DocumentIcon() {
  return (
    <svg
      className="h-5 w-5 text-ink-faint"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/** Badge text and tone for the clearance rule, derived from what the server computed. */
function clearanceBadge(profile) {
  const remaining = daysUntil(profile.policeClearanceExpiresAt);

  switch (profile.policeClearanceStatus) {
    case "RENEWAL_PENDING":
      return { tone: "info", label: "Renewal under review" };
    case "EXPIRED":
      return { tone: "danger", label: "Expired" };
    case "EXPIRING_SOON":
      return {
        tone: "warning",
        label: remaining <= 1 ? "Expires today" : `Expires in ${remaining} days`,
      };
    case "VALID":
      return { tone: "success", label: "Valid" };
    default:
      return { tone: "neutral", label: "Not uploaded" };
  }
}

function DocumentRow({ icon = <DocumentIcon />, name, meta, badge, url, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-field border border-line bg-surface-sunken/40 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{name}</p>
            {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
          </div>
          {meta && <p className="mt-1 text-xs text-ink-muted">{meta}</p>}
          {children}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
        {url ? (
          <>
            <DocumentLink url={url} name={name} />
            <button
              type="button"
              onClick={() => downloadFile(url, name)}
              className="text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Download
            </button>
          </>
        ) : (
          <span className="text-xs font-medium text-ink-faint">Not uploaded</span>
        )}
      </div>
    </div>
  );
}

export default function WorkerDocumentsCard({ profile, onUpdated }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!profile) return null;

  const badge = clearanceBadge(profile);
  const renewalPending = Boolean(profile.pendingPoliceClearanceUrl);
  const expiresAt = formatDate(profile.policeClearanceExpiresAt);
  const uploadedAt = formatDate(profile.policeClearanceUploadedAt);

  const pickFile = (picked) => {
    setError("");
    if (picked && picked.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError("That file is larger than 10 MB. Please upload a smaller scan.");
      return;
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Choose the report you want to upload.");
      return;
    }

    setUploading(true);
    try {
      const updated = await uploadPoliceClearance(file);
      setFile(null);
      onUpdated?.(updated);
      toast.success("Report uploaded. An admin will review it shortly.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not upload that report.");
    } finally {
      setUploading(false);
    }
  };

  const clearanceMeta = [
    uploadedAt && `Uploaded ${uploadedAt}`,
    expiresAt && `${profile.policeClearanceStatus === "EXPIRED" ? "Expired" : "Valid until"} ${expiresAt}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-e1 sm:p-6">
      <h2 className="text-base font-bold text-ink">Verification documents</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        What you gave us when you were verified. Only you and the SewaSathi team can open these.
      </p>

      <div className="mt-5 space-y-3">
        <DocumentRow
          name="Police Clearance Report"
          meta={clearanceMeta || "No date on record."}
          badge={badge}
          url={profile.policeClearanceUrl}
        >
          {/* A police clearance report is only good for six months, so this row is the one
              document a worker is expected to come back and replace. */}
          <div className="mt-3 max-w-md">
            {renewalPending ? (
              <div className="rounded-field border border-info/25 bg-info-soft p-3">
                <p className="text-xs font-semibold text-info-ink">
                  New report submitted {formatDate(profile.pendingPoliceClearanceUploadedAt)}
                </p>
                <p className="mt-1 text-xs text-info-ink/90">
                  An admin is reviewing it. Your current report stays on file until they accept it,
                  and you can keep working in the meantime.
                </p>
                <div className="mt-2">
                  <DocumentLink
                    url={profile.pendingPoliceClearanceUrl}
                    name="submitted report"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-ink-muted">
                  A police clearance report has to be renewed every 6 months. Upload a fresh one
                  and an admin will check it.
                </p>
                <div className="mt-2 space-y-2">
                  <FileDropzone
                    id="policeClearanceRenewal"
                    file={file}
                    error={error}
                    onChange={pickFile}
                    accept={ACCEPTED_TYPES}
                    disabled={uploading}
                    placeholder="Click to upload PDF or image"
                    className="py-4"
                  />
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    loading={uploading}
                  >
                    {uploading ? "Uploading…" : "Submit for review"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DocumentRow>

        <DocumentRow name="Citizenship / ID" url={profile.citizenshipDocUrl} />
        <DocumentRow name="Verification Photo" url={profile.profilePhotoUrl} />
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Your citizenship document and verification photo cannot be changed here. Contact support if
        either one is wrong or out of date.
      </p>
    </section>
  );
}
