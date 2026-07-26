import httpClient from "./httpClient";

export async function listConversations() {
  const { data } = await httpClient.get("/conversations");
  return data;
}

export async function getMessageHistory(conversationKey) {
  const { data } = await httpClient.get(`/conversations/${conversationKey}/messages`);
  return data;
}

export async function uploadAttachment(conversationKey, file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post(
    `/conversations/${conversationKey}/messages/attachments`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function deleteMessage(messageId) {
  const { data } = await httpClient.delete(`/messages/${messageId}`);
  return data;
}
