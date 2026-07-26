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

  // Signing in no longer always yields a token. When two-factor authentication is on,
  // or the sign-in comes from an unrecognised device, the API answers with a challenge
  // that has to be completed on the /verify-otp screen first. Callers branch on `status`
  // rather than assuming a session was established.
  const login = useCallback(async ({ email, password }) => {
    const data = await authApi.login({ email, password });

    if (data.challengeRequired) {
      return {
        status: "challenge",
        challengeToken: data.challengeToken,
        challengeReason: data.challengeReason,
      };
    }

    setToken(data.token);
    const sessionUser = toSessionUser(data.user);
    setSession(sessionUser);
    return { status: "authenticated", user: sessionUser };
  }, []);

  /** Completes a challenged sign-in with the code emailed to the user. */
  const verifyOtp = useCallback(async (challengeToken, code) => {
    const { token, user } = await authApi.verifyOtp(challengeToken, code);
    setToken(token);
    const sessionUser = toSessionUser(user);
    setSession(sessionUser);
    return sessionUser;
  }, []);

  // Registration creates the account only. The API deliberately returns no token: the
  // email address has to be confirmed before the account can sign in at all.
  const registerCustomer = useCallback(async (payload) => {
    const { user } = await authApi.registerCustomer(payload);
    return toSessionUser(user);
  }, []);

  const registerWorker = useCallback(async (payload) => {
    const { user } = await authApi.registerWorker(payload);
    return toSessionUser(user);
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
      verifyOtp,
      logoutCustomer: logout,
      registerCustomer,
      registerWorker,
    }),
    [session, initializing, login, verifyOtp, logout, registerCustomer, registerWorker],
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
