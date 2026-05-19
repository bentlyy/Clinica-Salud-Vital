import api from './axios';

export const register = async (data) => {
  const res = await api.post('/api/v1/auth/register', data);
  return res.data;
};

export const login = async (email, password) => {
  const res = await api.post('/api/v1/auth/login', { email, password });
  return res.data;
};

export const refreshToken = async (refresh_token) => {
  const res = await api.post('/api/v1/auth/refresh', { refresh_token });
  return res.data;
};

export const logout = async (refresh_token) => {
  const res = await api.post('/api/v1/auth/logout', { refresh_token });
  return res.data;
};

export const changePassword = async (current_password, new_password) => {
  const res = await api.post('/api/v1/auth/change-password', { current_password, new_password });
  return res.data;
};

export const enable2FA = async () => {
  const res = await api.post('/api/v1/auth/2fa/enable');
  return res.data;
};

export const verify2FA = async (token) => {
  const res = await api.post('/api/v1/auth/2fa/verify', { token });
  return res.data;
};

export const disable2FA = async () => {
  const res = await api.post('/api/v1/auth/2fa/disable');
  return res.data;
};
