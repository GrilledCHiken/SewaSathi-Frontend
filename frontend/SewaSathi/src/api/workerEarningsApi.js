import httpClient from "./httpClient";

/**
 * The worker's own earnings. Lives under `/worker` rather than `/payments`, which is
 * customer-only on the backend — a worker gets a 403 on every endpoint there.
 */
export async function getMyEarnings() {
  const { data } = await httpClient.get("/worker/earnings");
  return data;
}
