import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('tenant_id');
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch {
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

  const login = async (email, password, totp_token, captcha_token, tenant_id) => {
    const payload = { email, password };
    if (totp_token) payload.totp_token = totp_token;
    if (captcha_token) payload.captcha_token = captcha_token;
    if (tenant_id) payload.tenant_id = tenant_id;

    const res = await api.post('/auth/login', payload);

    const body = res.body || res.data;
    const userData = body.user || body;

    if (!userData) {
      throw new Error('Invalid response from server');
    }

    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.tenant_id) {
      localStorage.setItem('tenant_id', userData.tenant_id);
    }
    setUser(userData);

    return userData;
  };

  const register = async ({ email, password, name, rut, phone, tenant_id, invite_token }) => {
    const body = { email, password, name, rut, phone };
    if (tenant_id) body.tenant_id = tenant_id;
    if (invite_token) body.invite_token = invite_token;
    const res = await api.post('/auth/register', body);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};