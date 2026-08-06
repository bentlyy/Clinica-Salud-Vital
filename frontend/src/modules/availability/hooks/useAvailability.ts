import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityService } from '../services/availability.service';
import type { CreateAvailabilityRuleInput, CreateAvailabilityExceptionInput } from '../types/availability.types';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

export const availabilityKeys = {
  all: ['availability'] as const,
  rules: () => [...availabilityKeys.all, 'rules'] as const,
  exceptions: () => [...availabilityKeys.all, 'exceptions'] as const,
};

const STALE_TIME = 30_000;

export function useAvailabilityRules() {
  return useQuery({
    queryKey: availabilityKeys.rules(),
    queryFn: ({ signal }) => availabilityService.getRules({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useCreateAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAvailabilityRuleInput) => availabilityService.createRule(data),
    onSuccess: () => {
      toast.success(i18n.t('availability:ruleCreated'));
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('availability:ruleCreateError'));
    },
  });
}

export function useDeleteAvailabilityRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => availabilityService.deleteRule(id),
    onSuccess: () => {
      toast.success(i18n.t('availability:ruleDeleted'));
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('availability:ruleDeleteError'));
    },
  });
}

export function useAvailabilityExceptions() {
  return useQuery({
    queryKey: availabilityKeys.exceptions(),
    queryFn: ({ signal }) => availabilityService.getExceptions({ signal }),
    staleTime: STALE_TIME,
  });
}

export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAvailabilityExceptionInput) => availabilityService.createException(data),
    onSuccess: () => {
      toast.success(i18n.t('availability:exceptionCreated'));
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('availability:exceptionCreateError'));
    },
  });
}

export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => availabilityService.deleteException(id),
    onSuccess: () => {
      toast.success(i18n.t('availability:exceptionDeleted'));
      void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('availability:exceptionDeleteError'));
    },
  });
}
