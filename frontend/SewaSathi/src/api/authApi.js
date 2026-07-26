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

// Takes the address explicitly: an unverified account cannot sign in, so this
// endpoint has to work without a token or the user would be permanently stuck.
export async function resendVerification(email) {
  await httpClient.post("/auth/resend-verification", { email });
}

// Second half of a challenged sign-in. The challenge token identifies the account,
// so the email address is never re-sent from the client.
export async function verifyOtp(challengeToken, code) {
  const { data } = await httpClient.post("/auth/verify-otp", { challengeToken, code });
  return data;
}

export async function setTwoFactor(enabled) {
  await httpClient.post(`/auth/2fa/${enabled ? "enable" : "disable"}`);
}
