import httpClient from "./httpClient";

export async function listOpenTasks() {
  const { data } = await httpClient.get("/worker/tasks/open");
  return data;
}

export async function listMyJobs(status) {
  const { data } = await httpClient.get("/worker/tasks/mine", { params: status ? { status } : {} });
  return data;
}

export async function acceptTask(id) {
  const { data } = await httpClient.patch(`/worker/tasks/${id}/accept`);
  return data;
}

export async function declineTask(id) {
  const { data } = await httpClient.patch(`/worker/tasks/${id}/decline`);
  return data;
}

export async function startTask(id) {
  const { data } = await httpClient.patch(`/worker/tasks/${id}/start`);
  return data;
}

export async function completeTask(id) {
  const { data } = await httpClient.patch(`/worker/tasks/${id}/complete`);
  return data;
}
