import { Preferences } from "@capacitor/preferences";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAuthToken, setUnauthorizedHandler, type Session, type User } from "../api/client";

const TOKEN_KEY = "cv-studio.session";
// Refresh when less than this much time is left, so active users stay signed in.
const REFRESH_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function persist(session: Session | null) {
  if (session) await Preferences.set({ key: TOKEN_KEY, value: JSON.stringify({ token: session.token, expiresAt: session.expiresAt }) });
  else await Preferences.remove({ key: TOKEN_KEY });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<User | null>(null);

  const signedOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setStatus("signedOut");
    await persist(null);
  }, []);

  const signedIn = useCallback(async (session: Session) => {
    setAuthToken(session.token);
    await persist(session);
    setUser(session.user);
    setStatus("signedIn");
  }, []);

  // Restore the saved token on launch, refreshing it when it is close to expiring.
  useEffect(() => {
    setUnauthorizedHandler(() => { void signedOut(); });
    (async () => {
      const saved = (await Preferences.get({ key: TOKEN_KEY })).value;
      const stored = saved ? JSON.parse(saved) as { token: string; expiresAt: string } : null;
      if (!stored || new Date(stored.expiresAt).getTime() <= Date.now()) { await signedOut(); return; }
      setAuthToken(stored.token);
      try {
        if (new Date(stored.expiresAt).getTime() - Date.now() < REFRESH_WITHIN_MS) await signedIn(await api.refresh());
        else { setUser(await api.me()); setStatus("signedIn"); }
      } catch (error) {
        // Offline: keep the saved session; a real 401 already signed the user out.
        if (error instanceof Error && "status" in error && (error as { status: number }).status === 0) setStatus("signedIn");
        else await signedOut();
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [signedIn, signedOut]);

  const value = useMemo<AuthState>(() => ({
    status,
    user,
    login: async (email, password) => signedIn(await api.login({ email, password })),
    signUp: async (name, email, password) => signedIn(await api.signUp({ name, email, password })),
    logout: async () => { await api.logout().catch(() => undefined); await signedOut(); },
  }), [status, user, signedIn, signedOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
