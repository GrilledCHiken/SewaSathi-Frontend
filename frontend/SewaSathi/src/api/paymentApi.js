import httpClient from "./httpClient";

export async function initiateAdvancePayment(taskId, provider = "ESEWA") {
  const { data } = await httpClient.post("/payments/advance/initiate", {
    taskId,
    provider,
  });
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
