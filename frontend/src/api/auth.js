import api from './axios';

export const login = async (email, password, totpToken) => {
  const payload = { email, password };
  if (totpToken) payload.totp_token = totpToken;
  const res = await api.post('/auth/login', payload);
  return res.data;
};

export const register = async (data) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};

export const refreshToken = async (refresh_token) => {
  const res = await api.post('/auth/refresh', { refresh_token });
  return res.data;
};

export const logout = async (refresh_token) => {
  await api.post('/auth/logout', { refresh_token });
};

export const logoutAll = async () => {
  await api.post('/auth/logout-all');
};

export const changePassword = async (current_password, new_password) => {
  const res = await api.post('/auth/change-password', { current_password, new_password });
  return res.data;
};

export const enable2FA = async () => {
  const res = await api.post('/auth/2fa/enable');
  return res.data;
};

export const verify2FA = async (token) => {
  const res = await api.post('/auth/2fa/verify', { token });
  return res.data;
};

export const disable2FA = async () => {
  const res = await api.post('/auth/2fa/disable');
  return res.data;
};
