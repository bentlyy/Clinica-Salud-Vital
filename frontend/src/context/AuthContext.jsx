import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 al iniciar app
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      // opcional: podrías validar token con backend
      setUser({ token });
    }

    setLoading(false);
  }, []);

  // 🔥 LOGIN
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });

    const { token, user } = res.data;

    localStorage.setItem('token', token);
    setUser(user);

    return user;
  };

  // 🔥 REGISTER
  const register = async (email, password) => {
    const res = await api.post('/auth/register', { email, password });

    return res.data;
  };

  // 🔥 LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);