import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 INIT
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  // 🔥 LOGIN
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });

      console.log('LOGIN RESPONSE:', res.data);

      const { token, user } = res.data;

      if (!token || !user) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);

      return user;

    } catch (error) {
      console.error('LOGIN ERROR:', error);
      throw error;
    }
  };

  // 🔥 REGISTER
  const register = async (email, password) => {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
  };

  // 🔥 LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);