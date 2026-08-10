import httpClient from "./httpClient";

/**
 * Starts a signup. Creates no account: the reply is a challenge
 * ({ challengeToken, email, expiresInSeconds, resendAvailableInSeconds }) and the account
 * only exists once verifyRegistration accepts the code emailed to the address.
 */
export async function registerCustomer(payload) {
  const { data } = await httpClient.post("/auth/register/customer", payload);
  return data;
}

export async function registerWorker(payload) {
  const { data } = await httpClient.post("/auth/register/worker", payload);
  return data;
}

/** Finishes a signup. This is the call that creates the account. */
export async function verifyRegistration(payload) {
  const { data } = await httpClient.post("/auth/register/verify", payload);
  return data;
}

/** Sends another code for a signup already in flight; rejected inside the cooldown. */
export async function resendRegistrationOtp(payload) {
  const { data } = await httpClient.post("/auth/register/resend", payload);
  return data;
}

export async function login(payload) {
  const { data } = await httpClient.post("/auth/login", payload);
  return data;
}

/**
 * Starts a password reset. Same challenge shape as registration
 * ({ challengeToken, email, expiresInSeconds, resendAvailableInSeconds }); nothing about the
 * account changes until resetPassword, two calls later. A 404 means no account by that address.
 */
export async function requestPasswordReset(payload) {
  const { data } = await httpClient.post("/auth/password/forgot", payload);
  return data;
}

/** Sends another code for a reset already in flight; rejected inside the cooldown. */
export async function resendPasswordResetOtp(payload) {
  const { data } = await httpClient.post("/auth/password/resend", payload);
  return data;
}

/**
 * Proves the emailed code. Changes no password — it unlocks resetPassword and returns the
 * same challenge with a refreshed expiry, which is the window left to choose one.
 */
export async function verifyPasswordResetOtp(payload) {
  const { data } = await httpClient.post("/auth/password/verify", payload);
  return data;
}

/**
 * Sets the new password. Returns nothing and no session on purpose: the reset revokes every
 * existing token for the account, so the user signs in again with what they just chose.
 */
export async function resetPassword(payload) {
  await httpClient.post("/auth/password/reset", payload);
}

/**
 * Signs in with a Google ID token. Three outcomes, distinguished by status:
 *   200 — existing account, signed in
 *   201 — account created and signed in (sent with a `phone`)
 *   202 — verified, but no account yet; the body asks for a phone number
 * The status comes back alongside the body: 202 is not a failure, and the caller has to tell
 * it apart from the two that carry a session.
 */
export async function signInWithGoogle(payload) {
  const { data, status } = await httpClient.post("/auth/google", payload);
  return { data, status };
}

export async function getCurrentUser() {
  const { data } = await httpClient.get("/users/me");
  return data;
}

/**
 * Ends this session server-side by revoking its refresh token. Clearing localStorage alone
 * only forgets the credential; the token would stay renewable for its full seven days.
 */
export async function logout(refreshToken) {
  await httpClient.post("/auth/logout", { refreshToken });
}

/** Signs the account out on every device. */
export async function logoutEverywhere() {
  await httpClient.post("/auth/logout-all");
}
