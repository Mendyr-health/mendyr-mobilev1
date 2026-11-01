import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, restoreToken, saveTokens, setSessionEndedHandler } from '@/lib/api';
import type { TokenPair, User } from '@/lib/types';

export type RegisterInput = {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
  role: 'patient' | 'professional';
};

type Auth = {
  user: User | null;
  ready: boolean;
  /** Set when the server rejected the session (expired/revoked) so login can explain why. */
  sessionEnded: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
};

const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    restoreToken().then(async (t) => {
      if (t) {
        try {
          setUser(await api<User>('/auth/me'));
        } catch {
          await saveTokens(null);
        }
      }
      setReady(true);
    });
  }, []);

  // M2: when a request 401s and the refresh token is also dead, drop back to login. The
  // protected route groups react to `user` becoming null.
  useEffect(() => {
    setSessionEndedHandler(() => {
      qc.clear();
      setUser(null);
      setSessionEnded(true);
    });
    return () => setSessionEndedHandler(null);
  }, [qc]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<TokenPair>('/auth/login', { method: 'POST', body: { email, password } });
    await saveTokens(result);
    setSessionEnded(false);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api<TokenPair>('/auth/register', { method: 'POST', body: input });
    await saveTokens(result);
    setSessionEnded(false);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* the local session is cleared regardless */
    } finally {
      await saveTokens(null);
      qc.clear();
      setUser(null);
    }
  }, [qc]);

  const value = useMemo<Auth>(
    () => ({ user, ready, sessionEnded, setUser, login, register, logout }),
    [user, ready, sessionEnded, login, register, logout],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be within AuthProvider');
  return value;
}
