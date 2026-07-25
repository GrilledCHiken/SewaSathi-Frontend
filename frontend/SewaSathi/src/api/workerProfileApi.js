import httpClient from "./httpClient";

export async function getMyWorkerProfile() {
  const { data } = await httpClient.get("/worker/profile");
  return data;
}

export async function updateMyWorkerProfile(payload) {
  const { data } = await httpClient.patch("/worker/profile", payload);
  return data;
}

export async function submitWorkerVerification(formData) {
  const { data } = await httpClient.post("/worker/profile/verification", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
