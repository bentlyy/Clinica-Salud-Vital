import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { medicalHistoryService } from '../services/medical-history.service';
import type {
  MedicalHistoryListParams,
  CreateMedicalHistoryInput,
  UpdateMedicalHistoryInput,
} from '../types/medical-history.types';

export function useMedicalHistory(params: MedicalHistoryListParams = {}) {
  return useQuery({
    queryKey: ['medical-history', params],
    queryFn: ({ signal }) => medicalHistoryService.list(params, { signal }),
  });
}

export function usePatientMedicalHistory(patientId: number | null) {
  return useQuery({
    queryKey: ['medical-history', 'patient', patientId],
    queryFn: ({ signal }) => medicalHistoryService.getByPatient(patientId!, { signal }),
    enabled: patientId !== null && patientId > 0,
  });
}

export function useCreateMedicalHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMedicalHistoryInput) => medicalHistoryService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medical-history'] });
      toast.success(i18n.t('medical_history:entryCreated'));
    },
  });
}

export function useUpdateMedicalHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateMedicalHistoryInput }) =>
      medicalHistoryService.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medical-history'] });
      toast.success(i18n.t('medical_history:entryUpdated'));
    },
  });
}
