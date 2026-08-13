import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayService } from '../services/holiday.service';
import type { CreateHolidayInput } from '../types/holiday.types';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

const holidaysKeys = {
  all: ['holidays'] as const,
};

export function useHolidays() {
  return useQuery({
    queryKey: holidaysKeys.all,
    queryFn: () => holidayService.list(),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHolidayInput) => holidayService.create(input),
    onSuccess: (data) => {
      toast.success(
        i18n.t('holidays:created', { defaultValue: 'Feriado creado' }) +
          (data.cancelled_bookings > 0
            ? ` (${data.cancelled_bookings} ${i18n.t('holidays:bookingsCancelled', { defaultValue: 'citas canceladas' })})`
            : ''),
      );
      void queryClient.invalidateQueries({ queryKey: holidaysKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('holidays:createError', { defaultValue: 'Error al crear feriado' }));
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => holidayService.remove(id),
    onSuccess: () => {
      toast.success(i18n.t('holidays:deleted', { defaultValue: 'Feriado eliminado' }));
      void queryClient.invalidateQueries({ queryKey: holidaysKeys.all });
    },
    onError: () => {
      toast.error(i18n.t('holidays:deleteError', { defaultValue: 'Error al eliminar feriado' }));
    },
  });
}
