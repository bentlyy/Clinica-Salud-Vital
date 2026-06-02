import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

const parseJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch {
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const payload = parseJwtPayload(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        } finally {
          setLoading(false);
        }
      } else {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          api.post('/auth/refresh', { refresh_token: refreshToken })
            .then((res) => {
              localStorage.setItem('access_token', res.data.access_token);
              localStorage.setItem('refresh_token', res.data.refresh_token);
              const userPayload = parseJwtPayload(res.data.access_token);
              if (userPayload?.id) {
                const restored = JSON.parse(savedUser);
                if (restored.id === userPayload.id) setUser(restored);
              }
            })
            .catch(() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
            })
            .finally(() => setLoading(false));
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setLoading(false);
        }
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email, password, totp_token, captcha_token, tenant_id) => {
    const payload = { email, password };
    if (totp_token) payload.totp_token = totp_token;
    if (captcha_token) payload.captcha_token = captcha_token;
    if (tenant_id) payload.tenant_id = tenant_id;

    const res = await api.post('/auth/login', payload);

    const { access_token, refresh_token, user } = res.data;

    if (!access_token || !user) {
      throw new Error('Invalid response from server');
    }

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);

    return user;
  };

  const register = async ({ email, password, rut, phone, tenant_id }) => {
    const body = { email, password, rut, phone };
    if (tenant_id) body.tenant_id = tenant_id;
    const res = await api.post('/auth/register', body);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
