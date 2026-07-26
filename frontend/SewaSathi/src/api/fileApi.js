import httpClient from "./httpClient";

/**
 * Uploads are no longer public. They are served by GET /api/files/{name}, which requires a
 * bearer token — and a plain `<img src>` or `<a href>` cannot send one.
 *
 * So files are fetched through the same authenticated axios client as everything else and
 * handed to the browser as an object URL. Callers must revoke the URL when done, or the
 * blob stays in memory for the life of the page.
 */
function toFilename(storedUrl) {
  if (!storedUrl) return null;
  // Stored as "/uploads/<uuid>.<ext>"; only the final segment is addressable.
  return storedUrl.split("/").filter(Boolean).pop();
}

export async function fetchFileObjectUrl(storedUrl) {
  const filename = toFilename(storedUrl);
  if (!filename) return null;
  const { data } = await httpClient.get(`/files/${encodeURIComponent(filename)}`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
}

/** Triggers a save-to-disk for a file the user asked to download. */
export async function downloadFile(storedUrl, suggestedName) {
  const filename = toFilename(storedUrl);
  if (!filename) return;
  const { data } = await httpClient.get(`/files/${encodeURIComponent(filename)}`, {
    responseType: "blob",
    params: { download: true },
  });

  const objectUrl = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = suggestedName || filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
