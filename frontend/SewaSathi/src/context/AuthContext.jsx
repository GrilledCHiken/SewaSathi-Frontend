import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import { onUnauthorized } from "../api/httpClient";
import { clearToken, getRefreshToken, getToken, setTokens } from "../api/tokenStorage";

function computeInitials(fullName, email) {
  const source = fullName?.trim() || email?.split("@")[0] || "";
  const initials = source
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "CU";
}

function toSessionUser(user) {
  if (!user) return null;
  return {
    ...user,
    name: user.fullName,
    initials: computeInitials(user.fullName, user.email),
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(() => Boolean(getToken()));

  useEffect(() => {
    onUnauthorized(() => {
      clearToken();
      setSession(null);
    });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }
    authApi
      .getCurrentUser()
      .then((user) => setSession(toSessionUser(user)))
      .catch(() => clearToken())
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await authApi.login({ email, password });

    // Both halves: the access token expires in minutes, and the refresh token beside it
    // is what keeps the session alive.
    setTokens(data);
    const sessionUser = toSessionUser(data.user);
    setSession(sessionUser);
    return { status: "authenticated", user: sessionUser };
  }, []);

  // Registration creates the account and returns no token. The account is usable right
  // away; the signup pages send the user to /login to enter their password once.
  const registerCustomer = useCallback(async (payload) => {
    const { user } = await authApi.registerCustomer(payload);
    return toSessionUser(user);
  }, []);

  const registerWorker = useCallback(async (payload) => {
    const { user } = await authApi.registerWorker(payload);
    return toSessionUser(user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    // Clear locally first, and unconditionally: if the network call fails the user must
    // still end up signed out on this device rather than stuck in a half-session.
    clearToken();
    setSession(null);

    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // The token may already be revoked or expired, which is the desired end state.
      }
    }
  }, []);

  /** Revokes every session for this account, not just the one on this device. */
  const logoutEverywhere = useCallback(async () => {
    try {
      await authApi.logoutEverywhere();
    } finally {
      clearToken();
      setSession(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user: session,
      customer: session,
      isAuthenticated: Boolean(session),
      isCustomerAuthenticated: Boolean(session) && session.role === "CUSTOMER",
      initializing,
      login,
      logoutCustomer: logout,
      logoutEverywhere,
      registerCustomer,
      registerWorker,
    }),
    [
      session,
      initializing,
      login,
      logout,
      logoutEverywhere,
      registerCustomer,
      registerWorker,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
