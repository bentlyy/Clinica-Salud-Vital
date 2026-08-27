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
  async list(params: InvoiceListParams = {}, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<Invoice>> {
    const { data } = await apiClient.get<Invoice[] | PaginatedResponse<Invoice>>('/billing', { params, signal: opts?.signal });
    if (Array.isArray(data)) {
      return { data, total: data.length, page: params.page ?? 1, limit: params.limit ?? 50, totalPages: 1 };
    }
    return data;
  },

  async getById(id: number, opts?: { signal?: AbortSignal }): Promise<Invoice> {
    const { data } = await apiClient.get<Invoice>(`/billing/${id}`, { signal: opts?.signal });
    return data;
  },

  async create(input: CreateInvoiceInput, opts?: { signal?: AbortSignal }): Promise<Invoice> {
    const { data } = await apiClient.post<Invoice>('/billing', input, { signal: opts?.signal });
    return data;
  },

  async update(id: number, input: UpdateInvoiceInput, opts?: { signal?: AbortSignal }): Promise<Invoice> {
    const { data } = await apiClient.patch<Invoice>(`/billing/${id}`, input, { signal: opts?.signal });
    return data;
  },

  async remove(id: number, opts?: { signal?: AbortSignal }): Promise<void> {
    await apiClient.delete(`/billing/${id}`, { signal: opts?.signal });
  },

  async markAsPaid(id: number, opts?: { signal?: AbortSignal }): Promise<Invoice> {
    const { data } = await apiClient.patch<Invoice>(`/billing/${id}/status`, { status: 'paid' }, { signal: opts?.signal });
    return data;
  },

  async getStats(opts?: { signal?: AbortSignal }): Promise<BillingStats> {
    const { data } = await apiClient.get<BillingStats>('/billing/stats', { signal: opts?.signal });
    return data;
  },
};
