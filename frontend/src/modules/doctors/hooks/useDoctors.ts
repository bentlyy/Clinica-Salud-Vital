import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { doctorService } from '../services/doctor.service';
import type { DoctorListParams, CreateDoctorInput, UpdateDoctorInput } from '../types/doctor.types';

export function useDoctorList(params: DoctorListParams) {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: ({ signal }) => doctorService.list(params, { signal }),
  });
}

export function usePublicDoctorList() {
  return useQuery({
    queryKey: ['doctors', 'public'],
    queryFn: ({ signal }) => doctorService.listPublic({ signal }),
  });
}

export function useDoctorDetail(id: number) {
  return useQuery({
    queryKey: ['doctors', id],
    queryFn: ({ signal }) => doctorService.getById(id, { signal }),
    enabled: id > 0,
  });
}

export function useDoctorStats(id: number) {
  return useQuery({
    queryKey: ['doctors', id, 'stats'],
    queryFn: ({ signal }) => doctorService.getStats(id, { signal }),
    enabled: id > 0,
  });
}

export function useDoctorSchedule(id: number) {
  return useQuery({
    queryKey: ['doctors', id, 'schedule'],
    queryFn: ({ signal }) => doctorService.getSchedule(id, { signal }),
    enabled: id > 0,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDoctorInput) => doctorService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast.success(i18n.t('doctors:doctorCreated'));
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateDoctorInput }) =>
      doctorService.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors', variables.id] });
      toast.success(i18n.t('doctors:doctorUpdated'));
    },
  });
}

export function useInviteDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, email }: { id: number; email: string }) =>
      doctorService.invite(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast.success(i18n.t('doctors:inviteSent'));
    },
  });
}
