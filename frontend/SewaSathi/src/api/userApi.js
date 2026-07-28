import httpClient from "./httpClient";

/** The signed-in account, whatever the role. All of these act on /me — never an id. */

export async function updateMyProfile(payload) {
  const { data } = await httpClient.patch("/users/me", payload);
  return data;
}

export async function uploadMyAvatar(file) {
  const formData = new FormData();
  formData.append("photo", file);
  const { data } = await httpClient.post("/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removeMyAvatar() {
  const { data } = await httpClient.delete("/users/me/avatar");
  return data;
}

/**
 * Changing the password revokes every refresh token for the account, this device's
 * included, so the caller must send the user back to the sign-in page afterwards.
 */
export async function changeMyPassword(payload) {
  await httpClient.post("/users/me/password", payload);
}
