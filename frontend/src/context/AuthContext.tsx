import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';

export interface AuthContextValue {
  user: Record<string, unknown> | null;
  login: (email: string, password: string, totp_token?: string, captcha_token?: string, tenant_id?: string) => Promise<Record<string, unknown>>;
  register: (params: { email: string; password: string; name?: string; rut?: string; phone?: string; tenant_id?: string; invite_token?: string }) => Promise<Record<string, unknown>>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API call failed:', err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('tenant_id');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('tenant_id');
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = useCallback(async (email: string, password: string, totp_token?: string, captcha_token?: string, tenant_id?: string) => {
    const payload: Record<string, string> = { email, password };
    if (totp_token) payload.totp_token = totp_token;
    if (captcha_token) payload.captcha_token = captcha_token;
    if (tenant_id) payload.tenant_id = tenant_id;

    const res = await api.post('/auth/login', payload);

    const body = res.data;
    const userData = body.user || body;

    if (!userData) {
      throw new Error('Invalid response from server');
    }

    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.tenant_id) {
      localStorage.setItem('tenant_id', userData.tenant_id as string);
    }
    setUser(userData);

    return userData;
  }, []);

  const register = useCallback(async ({ email, password, name, rut, phone, tenant_id, invite_token }: {
    email: string; password: string; name?: string; rut?: string; phone?: string; tenant_id?: string; invite_token?: string
  }) => {
    const body: Record<string, string | undefined> = { email, password, name, rut, phone };
    if (tenant_id) body.tenant_id = tenant_id;
    if (invite_token) body.invite_token = invite_token;
    const res = await api.post('/auth/register', body);
    return res.data;
  }, []);

  const value = useMemo(() => ({ user, login, register, logout, loading }), [user, login, register, logout, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};