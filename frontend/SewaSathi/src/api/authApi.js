import httpClient from "./httpClient";

export async function registerCustomer(payload) {
  const { data } = await httpClient.post("/auth/register/customer", payload);
  return data;
}

export async function registerWorker(payload) {
  const { data } = await httpClient.post("/auth/register/worker", payload);
  return data;
}

export async function login(payload) {
  const { data } = await httpClient.post("/auth/login", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await httpClient.get("/users/me");
  return data;
}

export async function forgotPassword(email) {
  await httpClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token, newPassword) {
  await httpClient.post("/auth/reset-password", { token, newPassword });
}

export async function verifyEmail(token) {
  await httpClient.post("/auth/verify-email", { token });
}

export async function resendVerification() {
  await httpClient.post("/auth/resend-verification");
}
