import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { apiClient, setUnauthorizedHandler, CORE_LOGIN_URL } from '@/shared/services/api-client';
import type { InicioResponse, JwtUser, UserRole } from '@/shared/types/api.types';
import { hasPermission, normalizeRole } from '@/shared/utils/role.utils';

interface AuthContextType {
  user: JwtUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Logout central: lo atiende el Core (mountAmgAuth) y limpia la cookie. */
const CORE_LOGOUT_URL = '/auth/logout';

function goTo(url: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

function mapInicio(data: InicioResponse): JwtUser {
  return {
    id: data.usuario.id,
    email: data.usuario.email,
    name: data.usuario.name,
    role: normalizeRole(data.usuario.role as UserRole),
    tenant_id: data.organizacion.id,
    tenant_name: data.organizacion.nombre,
    tenant_slug: data.organizacion.slug,
    token_version: 0,
    iat: 0,
    exp: 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const { data } = await apiClient.get<InicioResponse>('/auth/inicio');
        if (!cancelled) setUser(mapInicio(data));
      } catch {
        // Sin sesión del Core: el guard del backend ya redirige al login central
        // cuando se navega; acá solo reflejamos "sin usuario" en el SPA.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      goTo(CORE_LOGIN_URL);
    });
  }, []);

  const login = useCallback(() => {
    goTo(CORE_LOGIN_URL);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    goTo(CORE_LOGOUT_URL);
  }, []);

  const logoutAll = useCallback(async () => {
    setUser(null);
    goTo(CORE_LOGOUT_URL);
  }, []);

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
