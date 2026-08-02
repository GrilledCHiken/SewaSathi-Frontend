import httpClient from "./httpClient";

/**
 * The read-only endpoints the marketing pages use.
 *
 * These are the only API calls in the app that work without a token — everything
 * else under /api needs a role. The pages that call them are served to visitors
 * who have not signed up yet, which is exactly why the backend exposes them.
 */

export async function getPublicStats() {
  const { data } = await httpClient.get("/public/stats");
  return data;
}

export async function getPublicServices() {
  const { data } = await httpClient.get("/public/services");
  return data;
}

export async function getTestimonials(limit = 3) {
  const { data } = await httpClient.get("/public/testimonials", { params: { limit } });
  return data;
}

export async function getOpenTasks(limit = 3) {
  const { data } = await httpClient.get("/public/open-tasks", { params: { limit } });
  return data;
}

export async function getContactInfo() {
  const { data } = await httpClient.get("/public/contact-info");
  return data;
}
