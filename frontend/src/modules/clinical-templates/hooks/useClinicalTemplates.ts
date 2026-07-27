import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clinicalTemplateService } from '../services/clinical-template.service';
import type { CreateTemplateInput, UpdateTemplateInput } from '../types/template.types';

export function useClinicalTemplates() {
  return useQuery({
    queryKey: ['clinical-templates'],
    queryFn: ({ signal }) => clinicalTemplateService.list({ signal }),
    enabled: false,
  });
}

export function useClinicalTemplateDetail(id: number | null) {
  return useQuery({
    queryKey: ['clinical-templates', id],
    queryFn: ({ signal }) => clinicalTemplateService.getById(id!, { signal }),
    enabled: id !== null && id > 0,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTemplateInput) => clinicalTemplateService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical-templates'] });
      toast.success('Plantilla creada correctamente');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTemplateInput }) =>
      clinicalTemplateService.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical-templates'] });
      toast.success('Plantilla actualizada correctamente');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clinicalTemplateService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical-templates'] });
      toast.success('Plantilla eliminada correctamente');
    },
  });
}
