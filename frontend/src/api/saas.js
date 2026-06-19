import api from './axios';

export const getFeatures = async () => {
  const res = await api.get('/saas/features');
  return res.data?.features || {};
};

export const getPlans = async () => {
  const res = await api.get('/saas/plans');
  return res.data?.data || [];
};
