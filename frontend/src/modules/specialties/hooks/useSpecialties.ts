import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { specialtyService } from '../services/specialty.service';
import type {
  SpecialtyListParams,
  CreateSpecialtyInput,
  UpdateSpecialtyInput,
} from '../types/specialty.types';

export const specialtyKeys = {
  all: ['specialties'] as const,
  list: (params?: SpecialtyListParams) => ['specialties', 'list', params] as const,
  detail: (id: number) => ['specialties', id] as const,
};

export function useSpecialtyList(params?: SpecialtyListParams) {
  return useQuery({
    queryKey: specialtyKeys.list(params),
    queryFn: ({ signal }) => specialtyService.list(params, { signal }),
    placeholderData: (prev) => prev,
  });
}

export function useSpecialtyDetail(id: number) {
  return useQuery({
    queryKey: specialtyKeys.detail(id),
    queryFn: ({ signal }) => specialtyService.getById(id, { signal }),
    enabled: id > 0,
  });
}

export function useCreateSpecialty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSpecialtyInput) => specialtyService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtyKeys.all });
      toast.success(i18n.t('specialties:specialtyCreated'));
    },
  });
}

export function useUpdateSpecialty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateSpecialtyInput }) =>
      specialtyService.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: specialtyKeys.all });
      queryClient.invalidateQueries({ queryKey: specialtyKeys.detail(variables.id) });
      toast.success(i18n.t('specialties:specialtyUpdated'));
    },
  });
}

export function useDeleteSpecialty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => specialtyService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specialtyKeys.all });
      toast.success(i18n.t('specialties:specialtyDeleted'));
    },
  });
}
