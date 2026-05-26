import api from './axios';

export const getPlans = async () => {
  const res = await api.get('/saas/plans');
  return res.data;
};

export const getMySubscription = async () => {
  const res = await api.get('/saas/subscription');
  return res.data;
};

export const createCheckout = async (plan_code, success_url, cancel_url) => {
  const res = await api.post('/saas/checkout', { plan_code, success_url, cancel_url });
  return res.data;
};

export const changePlan = async (plan_code) => {
  const res = await api.post('/saas/change-plan', { plan_code });
  return res.data;
};

export const cancelSubscription = async () => {
  const res = await api.post('/saas/cancel');
  return res.data;
};

export const getUsage = async (days = 30, metrics = 'api_calls') => {
  const res = await api.get(`/saas/usage?days=${days}&metrics=${metrics}`);
  return res.data;
};

export const getUsageSummary = async () => {
  const res = await api.get('/saas/usage/summary');
  return res.data;
};

export const getLimits = async () => {
  const res = await api.get('/saas/limits');
  return res.data;
};

export const onboardTenant = async (data) => {
  const res = await api.post('/saas/onboard', data);
  return res.data;
};

export const updateTenant = async (data) => {
  const res = await api.patch('/saas/tenant', data);
  return res.data;
};
