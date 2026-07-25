import httpClient from "./httpClient";

export async function getOverview() {
  const { data } = await httpClient.get("/admin/overview");
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

export async function rejectWorker(id) {
  const { data } = await httpClient.patch(`/admin/workers/${id}/reject`);
  return data;
}

export async function listUsers(filters = {}) {
  const { data } = await httpClient.get("/admin/users", { params: filters });
  return data;
}

export async function suspendUser(id) {
  const { data } = await httpClient.patch(`/admin/users/${id}/suspend`);
  return data;
}

export async function unsuspendUser(id) {
  const { data } = await httpClient.patch(`/admin/users/${id}/unsuspend`);
  return data;
}
