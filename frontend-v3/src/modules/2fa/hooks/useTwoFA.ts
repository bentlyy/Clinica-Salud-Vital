import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { twoFAService } from '../services/two-fa.service';

export const twoFAKeys = {
  status: ['2fa', 'status'] as const,
};

export function useTwoFAStatus() {
  return useQuery({
    queryKey: twoFAKeys.status,
    queryFn: () => twoFAService.getStatus(),
  });
}

export function useGenerateTwoFA() {
  return useMutation({
    mutationFn: () => twoFAService.generate(),
    onError: () => {
      toast.error('Error al generar el código 2FA');
    },
  });
}

export function useVerifyTwoFA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => twoFAService.verify(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFAKeys.status });
      toast.success('Autenticación de dos factores activada');
    },
    onError: () => {
      toast.error('Código inválido. Intenta de nuevo.');
    },
  });
}

export function useDisableTwoFA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => twoFAService.disable(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFAKeys.status });
      toast.success('Autenticación de dos factores desactivada');
    },
    onError: () => {
      toast.error('Error al desactivar 2FA');
    },
  });
}
