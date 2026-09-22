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
import { apiClient, setAccessToken, setUnauthorizedHandler, refreshSession, announceAccessToken } from '@/shared/services/api-client';
import type { JwtUser, AuthResponse } from '@/shared/types/api.types';
import { hasPermission, normalizeRole } from '@/shared/utils/role.utils';

interface AuthContextType {
  user: JwtUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totp_token?: string, captcha_token?: string, tenant_id?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(user: JwtUser): JwtUser {
  return user.role === 'user' ? { ...user, role: normalizeRole(user.role) } : user;
}

const LOGOUT_PENDING_KEY = 'auth_logout_pending';

function readLogoutPending(): boolean {
  try {
    return localStorage.getItem(LOGOUT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

function setLogoutPending(value: boolean): void {
  try {
    if (value) localStorage.setItem(LOGOUT_PENDING_KEY, '1');
    else localStorage.removeItem(LOGOUT_PENDING_KEY);
  } catch {
    // storage unavailable — best effort
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
          if (readLogoutPending()) {
            // A previous logout never reached the server (network/429/CSRF): the
            // refresh cookie is still alive server-side. Force the logout now so
            // the user is not silently logged back in after closing the session.
            try {
              await apiClient.post('/auth/logout');
            } catch {
              // best effort — local state must be clean regardless
            }
            setLogoutPending(false);
            setAccessToken(null);
            setUser(null);
          } else {
            announceAccessToken(data.access_token);
            setUser(normalizeUser(data.user));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAccessToken(null);
          const status = (err as { response?: { status?: number } })?.response?.status;
          const isAuthError = status === 401 || status === 400;
          if (isAuthError) {
            // Server definitively rejected the stale refresh token: clear local state
            setUser(null);
            localStorage.removeItem('auth_user');
            setLogoutPending(false);
          } else {
            // Network/5xx error: the session may still be valid server-side.
            // Surface an offline-style state so the UI does not silently show
            // stale phantom data. We deliberately do NOT trust localStorage here.
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

  const login = useCallback(async (email: string, password: string, totp_token?: string, captcha_token?: string, tenant_id?: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password, totp_token, captcha_token, ...(tenant_id ? { tenant_id } : {}) });
    if (data.requires_2fa) return data;
    announceAccessToken(data.access_token);
    setUser(normalizeUser(data.user));
    return data;
  }, []);

  const logout = useCallback(async () => {
    // Persist the "want logout" intent BEFORE the request: if the server call
    // fails (network, 429, CSRF) we won't silently re-login on next boot.
    setLogoutPending(true);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await apiClient.post('/auth/logout');
        setLogoutPending(false);
        break;
      } catch {
        if (attempt < 2) await delay(400 * 2 ** attempt);
      }
    }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('auth_user');
    navigate('/');
  }, [navigate]);

  const logoutAll = useCallback(async () => {
    setLogoutPending(true);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await apiClient.post('/auth/logout-all');
        setLogoutPending(false);
        break;
      } catch {
        if (attempt < 2) await delay(400 * 2 ** attempt);
      }
    }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('auth_user');
    navigate('/');
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
