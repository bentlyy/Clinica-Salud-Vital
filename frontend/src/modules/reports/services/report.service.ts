import { apiClient } from '@/shared/services/api-client';
import type { Report, GenerateReportInput, AvailableReportType } from '../types/report.types';

export const reportService = {
  async getAvailable(opts?: { signal?: AbortSignal }): Promise<AvailableReportType[]> {
    const { data } = await apiClient.get<AvailableReportType[]>('/reports/available', { signal: opts?.signal });
    return data;
  },

  async generate(input: GenerateReportInput, opts?: { signal?: AbortSignal }): Promise<Report> {
    const { data } = await apiClient.post<Report>('/reports/generate', input, { signal: opts?.signal });
    return data;
  },

  async getById(id: number, opts?: { signal?: AbortSignal }): Promise<Report> {
    const { data } = await apiClient.get<Report>(`/reports/${id}`, { signal: opts?.signal });
    return data;
  },
};
