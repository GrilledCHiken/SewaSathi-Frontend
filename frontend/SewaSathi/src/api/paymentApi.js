import httpClient from "./httpClient";

export async function initiateAdvancePayment(taskId, provider = "ESEWA") {
  const { data } = await httpClient.post("/payments/advance/initiate", {
    taskId,
    provider,
  });
  return data;
}

/** The rest of the price, due once the worker has finished the job. */
export async function initiateBalancePayment(taskId, provider = "ESEWA") {
  const { data } = await httpClient.post("/payments/balance/initiate", {
    taskId,
    provider,
  });
  return data;
}

/**
 * Declares the balance was handed over in cash. Returns the payment row rather than a
 * gateway handoff — there is nowhere to redirect to. The row stays `PENDING` and the task
 * stays `awaiting payment` until the worker confirms they received the money.
 */
export async function declareCashBalance(taskId) {
  const { data } = await httpClient.post("/payments/balance/cash", { taskId });
  return data;
}

export async function verifyEsewaPayment(esewaData) {
  const { data } = await httpClient.post("/payments/esewa/verify", {
    data: esewaData,
  });
  return data;
}

export async function verifyKhaltiPayment(pidx) {
  const { data } = await httpClient.post("/payments/khalti/verify", { pidx });
  return data;
}

export async function failPayment(transactionUuid) {
  const { data } = await httpClient.post(`/payments/${transactionUuid}/fail`);
  return data;
}

export async function listMyPayments() {
  const { data } = await httpClient.get("/payments/mine");
  return data;
}
