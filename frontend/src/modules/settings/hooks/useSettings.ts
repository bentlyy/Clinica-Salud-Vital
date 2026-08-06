import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { settingsService } from '../services/settings.service';
import type { ChangePasswordInput } from '../types/settings.types';

export const settingsKeys = {
  profile: ['settings', 'profile'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile,
    queryFn: ({ signal }) => settingsService.getProfile({ signal }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => settingsService.changePassword(input),
    onSuccess: () => {
      toast.success(i18n.t('settings:passwordChanged'));
    },
  });
}
