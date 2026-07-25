import httpClient from "./httpClient";

export async function submitContactMessage(payload) {
  await httpClient.post("/contact", payload);
}
