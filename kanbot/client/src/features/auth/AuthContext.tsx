import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { ApiError, setUnauthorizedHandler } from '../../api/client';
import { useToast } from '../../components/Toast';
import { t } from '../../i18n';
import { activeProjectStore, tokenStore } from '../../lib/token';
import type { LoginRequest, RegisterRequest, User } from '../../types/api';

type AuthState = {
  user: User | null;
  loading: boolean; // true while recovering a session on first load
  manualLogout: boolean; // the user pressed Logout (so the login page should not send them back here)
  login: (b: LoginRequest) => Promise<void>;
  register: (b: RegisterRequest) => Promise<void>;
  logout: () => void; // on purpose
  expireSession: () => void; // token missing/rejected: sign out and explain
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());
  const [manualLogout, setManualLogout] = useState(false);
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clear = useCallback(() => {
    tokenStore.clear();
    activeProjectStore.set(null);
    qc.clear();
    setUser(null);
  }, [qc]);

  const logout = useCallback(() => {
    setManualLogout(true);
    clear();
  }, [clear]);

  const expireSession = useCallback(() => {
    const hadSession = userRef.current !== null; // several requests can fail at once: explain only once
    userRef.current = null;
    clear();
    if (hadSession) toast(t('err.sessionEnded'), 'error');
  }, [clear, toast]);

  // Session recovery
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then((r) => setUser(r.user))
      .catch((e) => e instanceof ApiError && e.status === 401 && tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  const value = useMemo<AuthState>(() => {
    const accept = (r: { token: string; user: User }) => {
      tokenStore.set(r.token);
      setManualLogout(false);
      setUser(r.user);
    };
    return {
      user,
      loading,
      manualLogout,
      logout,
      expireSession,
      login: async (b) => accept(await authApi.login(b)),
      register: async (b) => accept(await authApi.register(b)),
    };
  }, [user, loading, manualLogout, logout, expireSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
