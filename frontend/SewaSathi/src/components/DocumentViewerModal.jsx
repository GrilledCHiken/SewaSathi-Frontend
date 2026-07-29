import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { downloadFile, fetchFileForViewing } from "../api/fileApi";

/**
 * Shows an uploaded file in place instead of saving it to disk.
 *
 * Uploads sit behind the authenticated /api/files endpoint, so an <iframe src> or <a href>
 * pointed at the API arrives without a bearer token and comes back 401. The bytes are fetched
 * through the axios client and handed to the browser as an object URL, which the built-in PDF
 * viewer and <img> both accept. A new tab would have been simpler, but window.open after an
 * await is treated as an unrequested popup and is usually blocked.
 */
export default function DocumentViewerModal({ storedUrl, title, onClose }) {
  // Keyed by the source it belongs to, and reset during render when that changes — React's
  // documented pattern for prop-derived state, and the same one AuthedImage uses.
  const [state, setState] = useState({ src: storedUrl, file: null, failed: false });
  const closeButtonRef = useRef(null);

  if (state.src !== storedUrl) {
    setState({ src: storedUrl, file: null, failed: false });
  }

  useEffect(() => {
    let cancelled = false;
    let created = null;

    fetchFileForViewing(storedUrl)
      .then((result) => {
        if (cancelled) {
          // Arrived after the modal closed — release it rather than leaking the blob.
          if (result) URL.revokeObjectURL(result.objectUrl);
          return;
        }
        created = result?.objectUrl ?? null;
        setState({ src: storedUrl, file: result, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ src: storedUrl, file: null, failed: true });
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [storedUrl]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Focus moves to the dialog on open only. Callers pass an inline onClose, so folding this
  // into the effect above would re-focus on every render and pull focus back off the document.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const save = useCallback(async () => {
    try {
      // The stored filename, not the button label, so the saved file keeps its extension.
      await downloadFile(storedUrl, state.file?.filename);
    } catch {
      toast.error("Could not download that document.");
    }
  }, [storedUrl, state.file]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-card bg-surface shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!state.file}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              Download
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1 rounded-lg p-1 text-ink-faint transition hover:bg-surface-sunken hover:text-ink-body"
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
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-surface-sunken">
          <DocumentBody file={state.file} failed={state.failed} title={title} />
        </div>
      </div>
    </div>
  );
}

function DocumentBody({ file, failed, title }) {
  if (failed) {
    return <p className="p-8 text-sm text-ink-muted">Could not open that document.</p>;
  }

  if (!file) {
    return <div className="h-full w-full animate-pulse bg-line" aria-hidden="true" />;
  }

  if (file.contentType === "application/pdf") {
    return <iframe src={file.objectUrl} title={title} className="h-full w-full border-0" />;
  }

  if (file.contentType.startsWith("image/")) {
    return <img src={file.objectUrl} alt={title} className="max-h-full max-w-full object-contain" />;
  }

  // Word documents and the like: no browser renders them, so offer the download instead.
  return (
    <p className="p-8 text-center text-sm text-ink-muted">
      This file type can&apos;t be previewed in the browser. Use Download to open it.
    </p>
  );
}
