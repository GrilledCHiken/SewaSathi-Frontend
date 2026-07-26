import httpClient from "./httpClient";

export async function listNotifications(limit = 20) {
  const { data } = await httpClient.get("/notifications", { params: { limit } });
  return data;
}

export async function getUnreadCount() {
  const { data } = await httpClient.get("/notifications/unread-count");
  return data.count;
}

export async function markNotificationRead(id) {
  await httpClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await httpClient.patch("/notifications/read-all");
}
