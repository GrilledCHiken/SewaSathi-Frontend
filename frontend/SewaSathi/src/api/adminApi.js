import httpClient from "./httpClient";

export async function getOverview() {
  const { data } = await httpClient.get("/admin/overview");
  return data;
}

/** Live analytics figures for a date range; omitting the range lets the server default it. */
export async function getAnalytics({ from, to } = {}) {
  const { data } = await httpClient.get("/admin/analytics", { params: { from, to } });
  return data;
}

export async function listPendingWorkers() {
  const { data } = await httpClient.get("/admin/workers/pending");
  return data;
}

export async function approveWorker(id) {
  const { data } = await httpClient.patch(`/admin/workers/${id}/approve`);
  return data;
}

/** The reason is mandatory: the server emails it to the applicant and stores it for their banner. */
export async function rejectWorker(id, reason) {
  const { data } = await httpClient.patch(`/admin/workers/${id}/reject`, { reason });
  return data;
}

/** Replacement police clearance reports waiting on a decision. These workers stay approved. */
export async function listClearanceRenewals() {
  const { data } = await httpClient.get("/admin/workers/clearance-renewals");
  return data;
}

export async function approveClearanceRenewal(id) {
  const { data } = await httpClient.patch(`/admin/workers/${id}/clearance/approve`);
  return data;
}

export async function rejectClearanceRenewal(id) {
  const { data } = await httpClient.patch(`/admin/workers/${id}/clearance/reject`);
  return data;
}

export async function listUsers(filters = {}) {
  const { data } = await httpClient.get("/admin/users", { params: filters });
  return data;
}

/** One account in full, including worker profile and documents when the user is a worker. */
export async function getUser(id) {
  const { data } = await httpClient.get(`/admin/users/${id}`);
  return data;
}

/**
 * `reason` is mandatory server-side: it is emailed to the account holder verbatim and
 * repeated on the login screen when they next try to sign in.
 */
export async function suspendUser(id, reason) {
  const { data } = await httpClient.patch(`/admin/users/${id}/suspend`, { reason });
  return data;
}

/** `note` is optional and only enriches the reinstatement email. */
export async function unsuspendUser(id, note) {
  const { data } = await httpClient.patch(`/admin/users/${id}/unsuspend`, { note });
  return data;
}

/** The Contact Us inbox. Omit `handled` for everything, or pass true/false to narrow. */
export async function listInquiries(filters = {}) {
  const { data } = await httpClient.get("/admin/inquiries", { params: filters });
  return data;
}

export async function resolveInquiry(id) {
  const { data } = await httpClient.patch(`/admin/inquiries/${id}/resolve`);
  return data;
}

export async function reopenInquiry(id) {
  const { data } = await httpClient.patch(`/admin/inquiries/${id}/reopen`);
  return data;
}

export async function listReports() {
  const { data } = await httpClient.get("/admin/reports");
  return data;
}

/**
 * Downloads a generated report (requirement #14).
 *
 * The endpoint needs a bearer token, which a plain `<a href>` cannot send, so the file comes
 * back over the authenticated client as a blob and is handed to the browser as an object
 * URL — the same approach fileApi.js uses for authenticated uploads.
 */
export async function downloadReport(slug, format, { from, to } = {}) {
  const response = await httpClient.get(`/admin/reports/${slug}`, {
    responseType: "blob",
    params: { format, from, to },
  });

  // Prefer the server's filename; it carries the report name and generation date.
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : `sewasathi-${slug}.${format}`;

  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
