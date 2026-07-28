import axios from "axios";
import { clearToken, getRefreshToken, getToken, setTokens } from "./tokenStorage";

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
});

httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler = null;

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

/**
 * In-flight refresh, shared by every request that hits a 401 at the same time.
 *
 * Without this, a page that fires several requests on mount would start several refreshes
 * at once. The server rotates on every exchange and treats a replayed token as theft, so
 * the second refresh would present an already-spent token and revoke the whole session —
 * turning an expired access token into a forced sign-out.
 */
let refreshPromise = null;

function refreshSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error("No refresh token"));
  }

  // A bare axios call, not httpClient: going through the instance would re-enter this
  // interceptor if the refresh itself 401s, and loop.
  refreshPromise = axios
    .post(`${httpClient.defaults.baseURL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      setTokens(data);
      return data.token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes("/auth/");

    // Retry once, and never for the auth endpoints themselves: a failed login is a real
    // 401 that the user has to answer, not an expired token to renew behind their back.
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthCall &&
      getRefreshToken()
    ) {
      original._retried = true;
      try {
        const token = await refreshSession();
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return httpClient(original);
      } catch {
        // The refresh token is expired, revoked, or the session went idle. Nothing left
        // to do but sign the user out.
        clearToken();
        if (unauthorizedHandler) {
          unauthorizedHandler();
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && unauthorizedHandler && !isAuthCall) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  },
);

export default httpClient;
