import httpClient from "./httpClient";

export async function createReview(payload) {
  const { data } = await httpClient.post("/reviews", payload);
  return data;
}

export async function listMyReviews() {
  const { data } = await httpClient.get("/reviews/mine");
  return data;
}

export async function listReviewableTasks() {
  const { data } = await httpClient.get("/reviews/reviewable-tasks");
  return data;
}
