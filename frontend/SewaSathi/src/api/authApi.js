import httpClient from "./httpClient";

export async function registerCustomer(payload) {
  const { data } = await httpClient.post("/auth/register/customer", payload);
  return data;
}

export async function registerWorker(payload) {
  const { data } = await httpClient.post("/auth/register/worker", payload);
  return data;
}


export async function verifyRegistration(payload) {
  const { data } = await httpClient.post("/auth/register/verify", payload);
  return data;
}


export async function resendRegistrationOtp(payload) {
  const { data } = await httpClient.post("/auth/register/resend", payload);
  return data;
}

export async function login(payload) {
  const { data } = await httpClient.post("/auth/login", payload);
  return data;
}


export async function requestPasswordReset(payload) {
  const { data } = await httpClient.post("/auth/password/forgot", payload);
  return data;
}


export async function resendPasswordResetOtp(payload) {
  const { data } = await httpClient.post("/auth/password/resend", payload);
  return data;
}


export async function verifyPasswordResetOtp(payload) {
  const { data } = await httpClient.post("/auth/password/verify", payload);
  return data;
}


export async function resetPassword(payload) {
  await httpClient.post("/auth/password/reset", payload);
}


export async function signInWithGoogle(payload) {
  const { data, status } = await httpClient.post("/auth/google", payload);
  return { data, status };
}

export async function getCurrentUser() {
  const { data } = await httpClient.get("/users/me");
  return data;
}


export async function logout(refreshToken) {
  await httpClient.post("/auth/logout", { refreshToken });
}

/** Signs the account out on every device. */
export async function logoutEverywhere() {
  await httpClient.post("/auth/logout-all");
}
