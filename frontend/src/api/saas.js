import api from './axios';

export const getFeatures = async () => {
  const res = await api.get('/saas/features');
  return res.data?.features || {};
};
