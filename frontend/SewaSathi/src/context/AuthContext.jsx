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

  /**
   * Signs in with a Google ID token.
   *
   * Returns `{ status: "authenticated", user }` when a session came back — the same shape
   * `login` returns, so callers can route on it identically — or
   * `{ status: "profileCompletionRequired", ...details }` when Google checked out but the
   * account still needs the phone number Google does not supply.
   */
  const loginWithGoogle = useCallback(async ({ credential, phone } = {}) => {
    const { data, status } = await authApi.signInWithGoogle({ credential, phone });

    if (status === 202) {
      return { status: "profileCompletionRequired", ...data };
    }

    setTokens(data);
    const sessionUser = toSessionUser(data.user);
    setSession(sessionUser);
    return { status: "authenticated", user: sessionUser, created: status === 201 };
  }, []);

  // Registering creates nothing: it emails a six-digit code and returns the challenge that
  // identifies it. The account exists only after verifyRegistration.
  const registerCustomer = useCallback(
    (payload) => authApi.registerCustomer(payload),
    [],
  );

  const registerWorker = useCallback(
    (payload) => authApi.registerWorker(payload),
    [],
  );

  /**
   * Spends the emailed code and creates the account. Still returns no token — the account
   * is usable right away, and the signup pages send the user to /login to enter their
   * password once (the worker flow signs in itself, because step two needs a session).
   */
  const verifyRegistration = useCallback(async (payload) => {
    const { user } = await authApi.verifyRegistration(payload);
    return toSessionUser(user);
  }, []);

  const resendRegistrationOtp = useCallback(
    (payload) => authApi.resendRegistrationOtp(payload),
    [],
  );

  // Password reset. None of these touch the session, since the caller has no credential;
  // they live here only because this is the one file that talks to authApi.
  const requestPasswordReset = useCallback(
    (payload) => authApi.requestPasswordReset(payload),
    [],
  );

  const resendPasswordResetOtp = useCallback(
    (payload) => authApi.resendPasswordResetOtp(payload),
    [],
  );

  const verifyPasswordResetOtp = useCallback(
    (payload) => authApi.verifyPasswordResetOtp(payload),
    [],
  );

  const resetPassword = useCallback((payload) => authApi.resetPassword(payload), []);

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

  /**
   * Folds a fresh /users/me-shaped payload into the session, so the header avatar and name
   * update from the response a profile edit already returned rather than by refetching.
   */
  const applyUserUpdate = useCallback((user) => {
    setSession(toSessionUser(user));
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
      loginWithGoogle,
      logoutCustomer: logout,
      logoutEverywhere,
      registerCustomer,
      registerWorker,
      verifyRegistration,
      resendRegistrationOtp,
      requestPasswordReset,
      resendPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      applyUserUpdate,
    }),
    [
      session,
      initializing,
      login,
      loginWithGoogle,
      logout,
      logoutEverywhere,
      registerCustomer,
      registerWorker,
      verifyRegistration,
      resendRegistrationOtp,
      requestPasswordReset,
      resendPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      applyUserUpdate,
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
