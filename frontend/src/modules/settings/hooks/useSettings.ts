import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { settingsService } from '../services/settings.service';
import type { ChangePasswordInput, Session } from '../types/settings.types';

export const settingsKeys = {
  profile: ['settings', 'profile'] as const,
  sessions: ['settings', 'sessions'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile,
    queryFn: ({ signal }) => settingsService.getProfile({ signal }),
  });
}

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: settingsKeys.sessions,
    queryFn: ({ signal }) => settingsService.getSessions({ signal }),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsService.revokeSession(id),
    onSuccess: () => {
      toast.success(i18n.t('settings:sessionRevoked'));
      void queryClient.invalidateQueries({ queryKey: settingsKeys.sessions });
    },
    onError: () => {
      toast.error(i18n.t('settings:sessionRevokeError'));
    },
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
