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

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const payload = parseJwtPayload(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      setLoading(false);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [logout]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });

    const { token, user } = res.data;

    if (!token || !user) {
      throw new Error('Invalid response from server');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);

    return user;
  };

  const register = async ({ email, password, rut, phone }) => {
    const res = await api.post('/auth/register', { email, password, rut, phone });
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
