import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient, setAccessToken, setUnauthorizedHandler } from '@/shared/services/api-client';
import type { JwtUser, AuthResponse } from '@/shared/types/api.types';
import { hasPermission } from '@/shared/utils/role.utils';

interface AuthContextType {
  user: JwtUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totp_token?: string, captcha_token?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const { data } = await axios.post<AuthResponse>(
          '/api/auth/refresh',
          {},
          { withCredentials: true },
        );
        if (!cancelled) {
          setAccessToken(data.access_token);
          setUser(data.user);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          const saved = localStorage.getItem('auth_user');
          if (saved) {
            try {
              setUser(JSON.parse(saved));
            } catch {
              setUser(null);
              localStorage.removeItem('auth_user');
            }
          } else {
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    restoreSession();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('auth_user');
      if (!isLoading) {
        navigate('/');
      }
    });
  }, [navigate, isLoading]);

  const login = useCallback(async (email: string, password: string, totp_token?: string, captcha_token?: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password, totp_token, captcha_token });
    if (data.requires_2fa) return data;
    setAccessToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('auth_user');
      navigate('/');
    }
  }, [navigate]);

  const logoutAll = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('auth_user');
      navigate('/');
    }
  }, [navigate]);

  const checkPermission = useCallback(
    (module: string, action?: string) => {
      if (!user) return false;
      return hasPermission(user.role, module, action);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      logoutAll,
      hasPermission: checkPermission,
    }),
    [user, isLoading, login, logout, logoutAll, checkPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
