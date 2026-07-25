import httpClient from "./httpClient";

export async function listConversations() {
  const { data } = await httpClient.get("/conversations");
  return data;
}

export async function getMessageHistory(taskId) {
  const { data } = await httpClient.get(`/tasks/${taskId}/messages`);
  return data;
}

export async function uploadAttachment(taskId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post(`/tasks/${taskId}/messages/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
