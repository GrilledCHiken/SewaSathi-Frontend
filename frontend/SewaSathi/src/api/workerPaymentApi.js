import httpClient from "./httpClient";

/**
 * The worker's answer to a cash claim. Lives under `/worker` rather than `/payments`,
 * which is customer-only on the backend — a worker gets a 403 on every endpoint there.
 */

/** Vouches for the cash. This is what closes the job out. */
export async function confirmCashPayment(taskId) {
  const { data } = await httpClient.post(
    `/worker/payments/${taskId}/cash/confirm`,
  );
  return data;
}

/**
 * Says the money never arrived. The claim is failed and the task stays `awaiting payment`,
 * so the customer can hand it over again or switch to a gateway.
 */
export async function rejectCashPayment(taskId) {
  const { data } = await httpClient.post(
    `/worker/payments/${taskId}/cash/reject`,
  );
  return data;
}
