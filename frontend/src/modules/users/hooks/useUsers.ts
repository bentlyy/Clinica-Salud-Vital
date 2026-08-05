import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { userService } from '../services/user.service';
import type { UserListParams, CreateDoctorInput, InviteUserInput } from '../types/user.types';

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: ({ signal }) => userService.list(params, { signal }),
    placeholderData: (prev) => prev,
  });
}

export function useRegisterDoctor() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('users');

  return useMutation({
    mutationFn: (input: CreateDoctorInput) => userService.registerDoctor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('userCreated'));
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('users');

  return useMutation({
    mutationFn: (input: InviteUserInput) => userService.invitePerson(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('inviteSent'));
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('users');

  return useMutation({
    mutationFn: (id: number) => userService.toggleActive(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.is_active ? t('userActivated') : t('userDeactivated'));
    },
  });
}
