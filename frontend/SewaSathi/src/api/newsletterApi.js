import httpClient from "./httpClient";

export async function subscribeToNewsletter(email) {
  await httpClient.post("/newsletter/subscribe", { email });
}
