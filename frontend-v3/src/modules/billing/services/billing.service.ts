import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type {
  Invoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceListParams,
  BillingStats,
} from '../types/billing.types';

export const billingService = {
  async list(params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> {
    const { data } = await apiClient.get<PaginatedResponse<Invoice>>('/billing', { params });
    return data;
  },

  async getById(id: number): Promise<Invoice> {
    const { data } = await apiClient.get<Invoice>(`/billing/${id}`);
    return data;
  },

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const { data } = await apiClient.post<Invoice>('/billing', input);
    return data;
  },

  async update(id: number, input: UpdateInvoiceInput): Promise<Invoice> {
    const { data } = await apiClient.patch<Invoice>(`/billing/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/billing/${id}`);
  },

  async markAsPaid(id: number): Promise<Invoice> {
    const { data } = await apiClient.patch<Invoice>(`/billing/${id}/status`, { status: 'paid' });
    return data;
  },

  async getStats(): Promise<BillingStats> {
    const { data } = await apiClient.get<BillingStats>('/billing/stats');
    return data;
  },
};
