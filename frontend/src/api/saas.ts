import api from './axios';

export interface Feature {
  [key: string]: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  [key: string]: unknown;
}

export const getFeatures = async (): Promise<Feature> => {
  const res = await api.get('/saas/features');
  return (res.data?.features as Feature) || {};
};

export const getPlans = async (): Promise<Plan[]> => {
  const res = await api.get('/saas/plans');
  return (res.data?.data as Plan[]) || [];
};
