import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { twoFAService } from '../services/two-fa.service';

export const twoFAKeys = {
  status: ['2fa', 'status'] as const,
};

export function useTwoFAStatus() {
  return useQuery({
    queryKey: twoFAKeys.status,
    queryFn: ({ signal }) => twoFAService.getStatus({ signal }),
  });
}

export function useGenerateTwoFA() {
  return useMutation({
    mutationFn: () => twoFAService.generate(),
    onError: () => {
      toast.error(i18n.t('two_fa:generateError'));
    },
  });
}

export function useVerifyTwoFA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => twoFAService.verify(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFAKeys.status });
      toast.success(i18n.t('two_fa:enabled'));
    },
    onError: () => {
      toast.error(i18n.t('two_fa:invalid_code'));
    },
  });
}

export function useDisableTwoFA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => twoFAService.disable(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFAKeys.status });
      toast.success(i18n.t('two_fa:disabled'));
    },
    onError: () => {
      toast.error(i18n.t('two_fa:disableError'));
    },
  });
}
