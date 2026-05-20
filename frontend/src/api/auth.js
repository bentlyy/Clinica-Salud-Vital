import api from './axios';

export const register = async (data) => {
  const res = await api.post('/auth/register', data);
  const res = await api.post('/auth/login', { email, password });
  const res = await api.post('/auth/refresh', { refresh_token });
  const res = await api.post('/auth/logout', { refresh_token });
  const res = await api.post('/auth/change-password', { current_password, new_password });
  const res = await api.post('/auth/2fa/enable');
  const res = await api.post('/auth/2fa/verify', { token });
  const res = await api.post('/auth/2fa/disable');
  return res.data;
};
