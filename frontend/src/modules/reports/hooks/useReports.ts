import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/report.service';
import type { GenerateReportInput } from '../types/report.types';
import toast from 'react-hot-toast';

const REPORT_KEYS = {
  all: ['reports'] as const,
  available: () => [...REPORT_KEYS.all, 'available'] as const,
  detail: (id: number) => [...REPORT_KEYS.all, 'detail', id] as const,
  history: () => [...REPORT_KEYS.all, 'history'] as const,
};

export function useAvailableReports() {
  return useQuery({
    queryKey: REPORT_KEYS.available(),
    queryFn: ({ signal }) => reportService.getAvailable({ signal }),
  });
}

export function useReportDetail(id: number) {
  return useQuery({
    queryKey: REPORT_KEYS.detail(id),
    queryFn: ({ signal }) => reportService.getById(id, { signal }),
    enabled: id > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'generating' ? 3000 : false;
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateReportInput) => reportService.generate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      toast.success('Reporte generado exitosamente');
    },
  });
}
