import { apiClient } from '@/shared/services/api-client';
import type { AxiosRequestConfig } from 'axios';
import type { CheckoutResponse, GetMySubscriptionResponse, Plan } from '../types/saas.types';

export const saasApi = {
  getPlans: async (config?: AxiosRequestConfig): Promise<Plan[]> => {
    const { data } = await apiClient.get<{ data: Plan[] }>('/saas/plans', config);
    return data.data;
  },

  getMySubscription: async (config?: AxiosRequestConfig): Promise<GetMySubscriptionResponse> => {
    const { data } = await apiClient.get<GetMySubscriptionResponse>('/saas/subscription', config);
    return data;
  },

  createCheckout: async (planCode: string): Promise<CheckoutResponse> => {
    const { data } = await apiClient.post<CheckoutResponse>('/saas/checkout', { plan_code: planCode });
    return data;
  },
};