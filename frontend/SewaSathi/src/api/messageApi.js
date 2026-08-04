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

/** Returns `{ total, byConversation }` — seeds every unread badge in one request. */
export async function getChatUnreadCounts() {
  const { data } = await httpClient.get("/conversations/unread-count");
  return data;
}

export async function markConversationRead(conversationKey) {
  await httpClient.post(`/conversations/${conversationKey}/read`);
}

export async function deleteMessage(messageId) {
  const { data } = await httpClient.delete(`/messages/${messageId}`);
  return data;
}
