import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { medicalHistoryService } from '../services/medical-history.service';
import type {
  MedicalHistoryListParams,
  CreateMedicalHistoryInput,
  UpdateMedicalHistoryInput,
} from '../types/medical-history.types';

export function useMedicalHistory(params: MedicalHistoryListParams = {}) {
  return useQuery({
    queryKey: ['medical-history', params],
    queryFn: () => medicalHistoryService.list(params),
  });
}

export function usePatientMedicalHistory(patientId: number | null) {
  return useQuery({
    queryKey: ['medical-history', 'patient', patientId],
    queryFn: () => medicalHistoryService.getByPatient(patientId!),
    enabled: patientId !== null && patientId > 0,
  });
}

export function useCreateMedicalHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMedicalHistoryInput) => medicalHistoryService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medical-history'] });
      toast.success('Entrada del historial creada correctamente');
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
      toast.success('Entrada del historial actualizada correctamente');
    },
  });
}
