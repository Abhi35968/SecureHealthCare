import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import API from "../api";
import {
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
  subscribe,
} from "../utils/authStorage";

const AuthContext = createContext(null);
const emptyAuth = { token: null, refreshToken: null, user: null };

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(emptyAuth);
  const [initializing, setInitializing] = useState(true);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.token && stored?.refreshToken) {
      setAuth(stored);
    }
    setInitializing(false);

    const unsubscribe = subscribe((payload) => {
      setAuth(payload || emptyAuth);
    });
    return unsubscribe;
  }, []);

  const updateState = useCallback((payload) => {
    if (payload?.token && payload?.refreshToken) {
      setAuth(payload);
      saveStoredAuth(payload);
    } else {
      setAuth(emptyAuth);
      clearStoredAuth();
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      setLastError(null);
      try {
        const res = await API.post("/auth/login", credentials, {
          skipAuthRetry: true,
        });

        if (!res.data?.token || !res.data?.refreshToken) {
          throw new Error("Malformed login response");
        }

        const payload = {
          token: res.data.token,
          refreshToken: res.data.refreshToken,
          user: res.data.user || null,
        };
        updateState(payload);
        return payload.user;
      } catch (err) {
        const message = err?.response?.data?.error || err.message || "Login failed";
        setLastError(message);
        throw err;
      }
    },
    [updateState]
  );

  const logout = useCallback(() => {
    updateState(null);
  }, [updateState]);

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      refreshToken: auth.refreshToken,
      isAuthenticated: Boolean(auth.token && auth.refreshToken),
      initializing,
      login,
      logout,
      lastError,
    }),
    [auth, initializing, lastError, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
