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

/**
 * Files a replacement police clearance report, which expires six months after it was uploaded.
 *
 * Distinct from submitWorkerVerification: that one re-files the whole application and demands the
 * citizenship document too. This hands in the one report and leaves the worker approved while an
 * admin reviews it.
 */
export async function uploadPoliceClearance(file) {
  const formData = new FormData();
  formData.append("policeClearance", file);
  const { data } = await httpClient.post("/worker/profile/police-clearance", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
