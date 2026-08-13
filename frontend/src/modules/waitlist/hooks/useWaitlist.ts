import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { waitlistService } from '../services/waitlist.service';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

export const waitlistKeys = {
  my: ['waitlist', 'me'] as const,
};

export function useMyWaitlist() {
  return useQuery({
    queryKey: waitlistKeys.my,
    queryFn: () => waitlistService.myList(),
  });
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ doctorId, date }: { doctorId: number; date: string }) =>
      waitlistService.join(doctorId, date),
    onSuccess: () => {
      toast.success(i18n.t('waitlist:joined', { defaultValue: 'Te uniste a la lista de espera' }));
      void queryClient.invalidateQueries({ queryKey: waitlistKeys.my });
    },
    onError: () => {
      toast.error(i18n.t('waitlist:joinError', { defaultValue: 'No se pudo unir a la lista de espera' }));
    },
  });
}

export function useLeaveWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => waitlistService.leave(id),
    onSuccess: () => {
      toast.success(i18n.t('waitlist:left', { defaultValue: 'Saliste de la lista de espera' }));
      void queryClient.invalidateQueries({ queryKey: waitlistKeys.my });
    },
  });
}
