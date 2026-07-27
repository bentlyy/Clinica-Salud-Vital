import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clinicalRecordService } from '../services/clinical-record.service';
import type {
  ClinicalRecordListParams,
  CreateClinicalRecordInput,
  UpdateClinicalRecordInput,
} from '../types/clinical-record.types';

export function useClinicalRecords(params: ClinicalRecordListParams = {}) {
  return useQuery({
    queryKey: ['clinical-records', params],
    queryFn: ({ signal }) => clinicalRecordService.list(params, { signal }),
  });
}

export function useClinicalRecordDetail(id: number | null) {
  return useQuery({
    queryKey: ['clinical-records', id],
    queryFn: ({ signal }) => clinicalRecordService.getById(id!, { signal }),
    enabled: id !== null && id > 0,
  });
}

export function usePatientRecords(patientId: number | null) {
  return useQuery({
    queryKey: ['clinical-records', 'patient', patientId],
    queryFn: ({ signal }) => clinicalRecordService.getByPatient(patientId!, { signal }),
    enabled: patientId !== null && patientId > 0,
  });
}

export function useCreateClinicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClinicalRecordInput) => clinicalRecordService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success('Expediente creado correctamente');
    },
  });
}

export function useUpdateClinicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateClinicalRecordInput }) =>
      clinicalRecordService.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success('Expediente actualizado correctamente');
    },
  });
}

export function useDeleteClinicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clinicalRecordService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical-records'] });
      toast.success('Expediente eliminado correctamente');
    },
  });
}
