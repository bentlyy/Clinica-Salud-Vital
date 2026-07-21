import { apiClient } from '@/shared/services/api-client';
import type { Report, GenerateReportInput, AvailableReportType } from '../types/report.types';

export const reportService = {
  async getAvailable(): Promise<AvailableReportType[]> {
    const { data } = await apiClient.get<AvailableReportType[]>('/reports/available');
    return data;
  },

  async generate(input: GenerateReportInput): Promise<Report> {
    const { data } = await apiClient.post<Report>('/reports/generate', input);
    return data;
  },

  async getById(id: number): Promise<Report> {
    const { data } = await apiClient.get<Report>(`/reports/${id}`);
    return data;
  },
};
