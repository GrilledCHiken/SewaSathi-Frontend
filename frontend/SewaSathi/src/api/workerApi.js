import httpClient from "./httpClient";

export async function listWorkers(filters = {}) {
  const { data } = await httpClient.get("/workers", { params: filters });
  return data;
}
