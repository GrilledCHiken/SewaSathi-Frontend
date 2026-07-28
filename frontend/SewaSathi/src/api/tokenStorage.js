const TOKEN_KEY = "sewasathi_token";
const REFRESH_TOKEN_KEY = "sewasathi_refresh_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Stores the pair returned by a sign-in or a refresh.
 *
 * The access token is now minutes long, so the refresh token beside it is what actually
 * keeps the user signed in. They are written together because a session with only one half
 * is unusable, and clearing must likewise take both.
 */
export function setTokens({ token, refreshToken }) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
