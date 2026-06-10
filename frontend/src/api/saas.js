import api from './axios';

export const getPlans = async (options = {}) => {
  const res = await api.get('/saas/plans', options);
  return res.data;
};

export const getMySubscription = async (options = {}) => {
  const res = await api.get('/saas/subscription', options);
  return res.data;
};

export const createCheckout = async (plan_code, success_url, cancel_url, options = {}) => {
  const res = await api.post('/saas/checkout', { plan_code, success_url, cancel_url }, options);
  return res.data;
};

export const changePlan = async (plan_code, options = {}) => {
  const res = await api.post('/saas/change-plan', { plan_code }, options);
  return res.data;
};

export const cancelSubscription = async (options = {}) => {
  const res = await api.post('/saas/cancel', {}, options);
  return res.data;
};

export const getUsage = async (days = 30, metrics = 'api_calls', options = {}) => {
  const res = await api.get(`/saas/usage?days=${days}&metrics=${metrics}`, options);
  return res.data;
};

export const getUsageSummary = async (options = {}) => {
  const res = await api.get('/saas/usage/summary', options);
  return res.data;
};

export const getLimits = async (options = {}) => {
  const res = await api.get('/saas/limits', options);
  return res.data;
};

export const onboardTenant = async (data, options = {}) => {
  const res = await api.post('/saas/onboard', data, options);
  return res.data;
};

export const updateTenant = async (data, options = {}) => {
  const res = await api.patch('/saas/tenant', data, options);
  return res.data;
};
