import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { apiRequest, setAuthToken, setUnauthorizedHandler } from "./api";
import { clearSession, getStoredSession, saveSession } from "./auth-storage";

type LoginResponse = { access_token: string; refresh_token: string; user_id: string; email: string };
type SignupResponse = { user_id: string | null; email: string | null; confirmation_required: boolean };

type AuthState = {
  userId: string | null;
  email: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(async () => {
    setAuthToken(null);
    setUserId(null);
    setEmail(null);
    await clearSession();
  }, []);

  // Any request that comes back 401 (expired/invalid token) should log the
  // whole app out, not just fail the one request that hit it.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth();
    });
  }, [clearAuth]);

  useEffect(() => {
    (async () => {
      const stored = await getStoredSession();
      if (stored) {
        setAuthToken(stored.accessToken);
        setUserId(stored.userId);
        setEmail(stored.email);
        // No "whoami" endpoint exists yet, so we optimistically trust the
        // stored token here; a 401 on the first real request clears it via
        // the handler above.
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (loginEmail: string, password: string) => {
    const result = await apiRequest<LoginResponse>("/login", {
      method: "POST",
      body: { email: loginEmail, password },
    });
    setAuthToken(result.access_token);
    setUserId(result.user_id);
    setEmail(result.email);
    await saveSession({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      userId: result.user_id,
      email: result.email,
    });
  }, []);

  const signup = useCallback(async (signupEmail: string, password: string) => {
    // /signup never returns a session (even when Supabase doesn't require
    // email confirmation) — only user info. Caller is expected to follow up
    // with login() using the same credentials once this resolves.
    const result = await apiRequest<SignupResponse>("/signup", {
      method: "POST",
      body: { email: signupEmail, password },
    });
    return { confirmationRequired: result.confirmation_required };
  }, []);

  const logout = useCallback(async () => {
    const stored = await getStoredSession();
    if (stored) {
      try {
        await apiRequest("/logout", {
          method: "POST",
          body: { refresh_token: stored.refreshToken },
        });
      } catch {
        // Best-effort server-side revoke — always clear local state regardless.
      }
    }
    await clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ userId, email, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
