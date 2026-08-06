import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { prescriptionService } from '../services/prescription.service';
import type {
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from '../types/prescription.types';

export function usePrescriptionsByRecord(recordId: number) {
  return useQuery({
    queryKey: ['prescriptions', 'record', recordId],
    queryFn: ({ signal }) => prescriptionService.listByRecord(recordId, { signal }),
    enabled: recordId > 0,
  });
}

export function useAllPrescriptions() {
  return useQuery({
    queryKey: ['prescriptions', 'all'],
    queryFn: ({ signal }) => prescriptionService.listAll({ signal }),
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePrescriptionInput) => prescriptionService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success(i18n.t('prescriptions:created'));
    },
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePrescriptionInput }) =>
      prescriptionService.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success(i18n.t('prescriptions:updated'));
    },
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => prescriptionService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success(i18n.t('prescriptions:deleted'));
    },
  });
}

export function useDownloadPrescriptionPdf() {
  return useMutation({
    mutationFn: (id: number) => prescriptionService.downloadPdf(id),
    onError: () => {
      toast.error(i18n.t('prescriptions:downloadError'));
    },
  });
}
