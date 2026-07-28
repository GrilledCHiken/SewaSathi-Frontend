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

/**
 * Ends this session server-side by revoking its refresh token.
 *
 * Without it, clearing localStorage only forgets the credential — the refresh token would
 * stay valid for its full seven days, so anyone who had captured it could keep renewing.
 */
export async function logout(refreshToken) {
  await httpClient.post("/auth/logout", { refreshToken });
}

/** Signs the account out on every device. */
export async function logoutEverywhere() {
  await httpClient.post("/auth/logout-all");
}
