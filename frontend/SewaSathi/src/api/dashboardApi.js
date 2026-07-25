import httpClient from "./httpClient";

export async function getDashboardSummary() {
  const { data } = await httpClient.get("/dashboard/summary");
  return data;
}
