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
import { apiClient, setAccessToken, setUnauthorizedHandler, refreshSession } from '@/shared/services/api-client';
import type { JwtUser, AuthResponse } from '@/shared/types/api.types';
import { hasPermission, normalizeRole } from '@/shared/utils/role.utils';

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

function normalizeUser(user: JwtUser): JwtUser {
  return user.role === 'user' ? { ...user, role: normalizeRole(user.role) } : user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const data = await refreshSession();
        if (!cancelled) {
          setAccessToken(data.access_token);
          setUser(normalizeUser(data.user));
          localStorage.setItem('auth_user', JSON.stringify(normalizeUser(data.user)));
        }
      } catch (err) {
        if (!cancelled) {
          setAccessToken(null);
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 400) {
            setUser(null);
            localStorage.removeItem('auth_user');
          } else {
            const saved = localStorage.getItem('auth_user');
            if (saved) {
              try {
                setUser(normalizeUser(JSON.parse(saved)));
              } catch {
                setUser(null);
                localStorage.removeItem('auth_user');
              }
            } else {
              setUser(null);
            }
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
    setUser(normalizeUser(data.user));
    localStorage.setItem('auth_user', JSON.stringify(normalizeUser(data.user)));
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
