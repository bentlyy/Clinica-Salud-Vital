import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityService } from '../services/availability.service';
import type { CreateAvailabilityRuleInput } from '../types/availability.types';
import toast from 'react-hot-toast';

export const availabilityKeys = {
  all: ['availability'] as const,
  rules: () => [...availabilityKeys.all, 'rules'] as const,
};

const STALE_TIME = 30_000;

export function useAvailabilityRules() {
  return useQuery({
    queryKey: availabilityKeys.rules(),
    queryFn: () => availabilityService.getRules(),
    staleTime: STALE_TIME,
  });
}

export function useCreateAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAvailabilityRuleInput) => availabilityService.createRule(data),
    onSuccess: () => {
      toast.success('Regla de disponibilidad creada');
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      toast.error('Error al crear la regla de disponibilidad');
    },
  });
}

export function useDeleteAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => availabilityService.deleteRule(id),
    onSuccess: () => {
      toast.success('Regla de disponibilidad eliminada');
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      toast.error('Error al eliminar la regla de disponibilidad');
    },
  });
}
