import httpClient from "./httpClient";

export async function createTask(payload) {
  const { data } = await httpClient.post("/tasks", payload);
  return data;
}

export async function listMyTasks(status) {
  const { data } = await httpClient.get("/tasks/mine", { params: status ? { status } : {} });
  return data;
}

export async function getTask(id) {
  const { data } = await httpClient.get(`/tasks/${id}`);
  return data;
}

export async function cancelTask(id) {
  const { data } = await httpClient.patch(`/tasks/${id}/cancel`);
  return data;
}

export async function assignWorker(id, workerId) {
  const { data } = await httpClient.patch(`/tasks/${id}/assign`, { workerId });
  return data;
}
