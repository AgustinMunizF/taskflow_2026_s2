import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { api, clearToken, getStoredUser, getToken, setStoredUser, setToken } from './api';
import type { User } from '../types';

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>());
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const applyAuth = useCallback((res: AuthResponse) => {
    setToken(res.token);
    setStoredUser(res.user);
    setTokenState(res.token);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      applyAuth(res);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const body: Record<string, unknown> = { email, password };
      if (name) body.name = name;
      const res = await api<AuthResponse>('/auth/register', { method: 'POST', body });
      applyAuth(res);
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, login, register, logout }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
