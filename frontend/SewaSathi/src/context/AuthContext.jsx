import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import { onUnauthorized } from "../api/httpClient";
import { clearToken, getToken, setToken } from "../api/tokenStorage";

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
    const { token, user } = await authApi.login({ email, password });
    setToken(token);
    const sessionUser = toSessionUser(user);
    setSession(sessionUser);
    return sessionUser;
  }, []);

  const registerCustomer = useCallback(async (payload) => {
    const { token, user } = await authApi.registerCustomer(payload);
    setToken(token);
    const sessionUser = toSessionUser(user);
    setSession(sessionUser);
    return sessionUser;
  }, []);

  const registerWorker = useCallback(async (payload) => {
    const { token, user } = await authApi.registerWorker(payload);
    setToken(token);
    const sessionUser = toSessionUser(user);
    setSession(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setSession(null);
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
      registerCustomer,
      registerWorker,
    }),
    [session, initializing, login, logout, registerCustomer, registerWorker],
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
