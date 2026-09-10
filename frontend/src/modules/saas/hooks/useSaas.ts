import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saasApi } from '../services/saas.service';

const SAAS_KEYS = {
  all: ['saas'] as const,
  plans: () => [...SAAS_KEYS.all, 'plans'] as const,
  subscription: () => [...SAAS_KEYS.all, 'subscription'] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: SAAS_KEYS.plans(),
    queryFn: ({ signal }) => saasApi.getPlans({ signal }),
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: SAAS_KEYS.subscription(),
    queryFn: ({ signal }) => saasApi.getMySubscription({ signal }),
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planCode: string) => saasApi.createCheckout(planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAAS_KEYS.all });
    },
  });
}