"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readSession, logout, type BrowserSession } from "./client";
import type { ApiFailure, ApiResult } from "@/features/backend/client";
import type { FrontendMode } from "@/features/backend/frontend-mode";

type AuthState = {
  mode: FrontendMode;
  session: BrowserSession | null; loading: boolean; error: ApiFailure | null;
  refresh: () => Promise<void>; setSession: (session: BrowserSession) => void;
  signOut: () => Promise<ApiResult<undefined>>;
  sessionEpoch: number; isCurrentSession: (epoch: number) => boolean;
};
const AuthContext = createContext<AuthState | null>(null);
function clearRememberedSession() {
  try { localStorage.removeItem("ciscoku:active-instance:v1"); } catch { /* Storage is optional. */ }
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("ciscoku:mutation:")) sessionStorage.removeItem(key);
  } catch { /* Storage is optional. */ }
}
export function AuthProvider({ children, mode }: { children: ReactNode; mode: FrontendMode }) {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [loading, setLoading] = useState(mode === "live");
  const generation = useRef(0);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [error, setError] = useState<ApiFailure | null>(null);
  const invalidate = useCallback(() => {
    const epoch = ++generation.current;
    setSessionEpoch(epoch);
    return epoch;
  }, []);
  const isCurrentSession = useCallback((epoch: number) => epoch === generation.current, []);
  const refresh = useCallback(async () => {
    if (mode !== "live") return;
    const revision = invalidate();
    setLoading(true);
    const result = await readSession();
    if (revision !== generation.current) return;
    if (result.ok) { setSession(result.value); setError(null); }
    else { setSession(null); setError(result); }
    setLoading(false);
  }, [mode, invalidate]);
  useEffect(() => {
    if (mode !== "live") return;
    const controller = new AbortController();
    const revision = generation.current;
    void readSession(controller.signal).then(result => {
      if (controller.signal.aborted || revision !== generation.current) return;
      if (result.ok) setSession(result.value);
      else setError(result);
      setLoading(false);
    });
    return () => controller.abort();
  }, [mode]);
  const signOut = useCallback(async () => {
    if (mode !== "live") return { ok: true as const, value: undefined };
    const revision = invalidate();
    setLoading(true);
    const result = await logout();
    if (revision !== generation.current) return result;
    setLoading(false);
    if (result.ok) {
      setSession({ authenticated: false });
      setError(null);
      clearRememberedSession();
      window.dispatchEvent(new Event("ciscoku:session-ended"));
    } else setError(result);
    return result;
  }, [mode, invalidate]);
  const updateSession = useCallback((value: BrowserSession) => {
    invalidate();
    clearRememberedSession();
    setSession(value); setLoading(false); setError(null);
  }, [invalidate]);
  const value = useMemo(() => ({ mode, session, loading, error, refresh, setSession: updateSession, signOut, sessionEpoch, isCurrentSession }), [mode, session, loading, error, refresh, updateSession, signOut, sessionEpoch, isCurrentSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required.");
  return value;
}
