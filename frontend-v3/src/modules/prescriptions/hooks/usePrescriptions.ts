import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { prescriptionService } from '../services/prescription.service';
import type {
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from '../types/prescription.types';

export function usePrescriptionsByRecord(recordId: number) {
  return useQuery({
    queryKey: ['prescriptions', 'record', recordId],
    queryFn: () => prescriptionService.listByRecord(recordId),
    enabled: recordId > 0,
  });
}

export function useAllPrescriptions() {
  return useQuery({
    queryKey: ['prescriptions', 'all'],
    queryFn: () => prescriptionService.listAll(),
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePrescriptionInput) => prescriptionService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Receta creada correctamente');
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
      toast.success('Receta actualizada correctamente');
    },
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => prescriptionService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Receta eliminada correctamente');
    },
  });
}

export function useDownloadPrescriptionPdf() {
  return useMutation({
    mutationFn: (id: number) => prescriptionService.downloadPdf(id),
    onError: () => {
      toast.error('Error al descargar el PDF');
    },
  });
}
