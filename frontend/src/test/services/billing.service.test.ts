import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Invoice, BillingStats } from '@/modules/billing/types/billing.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { billingService } from '@/modules/billing/services/billing.service';

const invoice: Invoice = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  invoice_number: 'INV-001',
  amount: 100,
  tax: 19,
  total: 119,
  status: 'pending',
  due_date: '2026-08-15',
  items: [{ description: 'Consulta', quantity: 1, unit_price: 100, total: 100 }],
  created_at: '2026-08-01T10:00:00Z',
  patient_name: 'Maria Garcia',
};

describe('billingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list: GETs /billing with params and signal', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [invoice], total: 1 } });
    const signal = new AbortController().signal;
    const result = await billingService.list({ page: 2, limit: 10, status: 'pending' }, { signal });

    expect(apiClient.get).toHaveBeenCalledWith('/billing', {
      params: { page: 2, limit: 10, status: 'pending' },
      signal,
    });
    expect(result.data).toEqual([invoice]);
  });

  it('list: works without params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [], total: 0 } });
    const result = await billingService.list();
    expect(apiClient.get).toHaveBeenCalledWith('/billing', { params: {}, signal: undefined });
    expect(result.total).toBe(0);
  });

  it('getById: GETs /billing/:id and returns the invoice', async () => {
    apiClient.get.mockResolvedValue({ data: invoice });
    const result = await billingService.getById(1);
    expect(apiClient.get).toHaveBeenCalledWith('/billing/1', { signal: undefined });
    expect(result).toEqual(invoice);
  });

  it('create: POSTs /billing with the input', async () => {
    apiClient.post.mockResolvedValue({ data: invoice });
    const input = {
      patient_id: 10,
      items: invoice.items,
      tax: 19,
      due_date: '2026-08-15',
      notes: 'n/a',
    };
    const result = await billingService.create(input);
    expect(apiClient.post).toHaveBeenCalledWith('/billing', input, { signal: undefined });
    expect(result).toEqual(invoice);
  });

  it('update: PATCHes /billing/:id with the input', async () => {
    apiClient.patch.mockResolvedValue({ data: { ...invoice, status: 'paid' } });
    const result = await billingService.update(1, { status: 'paid' });
    expect(apiClient.patch).toHaveBeenCalledWith('/billing/1', { status: 'paid' }, { signal: undefined });
    expect(result.status).toBe('paid');
  });

  it('remove: DELETEs /billing/:id', async () => {
    apiClient.delete.mockResolvedValue({});
    await billingService.remove(5);
    expect(apiClient.delete).toHaveBeenCalledWith('/billing/5', { signal: undefined });
  });

  it('markAsPaid: PATCHes /billing/:id/status with status paid', async () => {
    apiClient.patch.mockResolvedValue({ data: { ...invoice, status: 'paid' } });
    const result = await billingService.markAsPaid(1);
    expect(apiClient.patch).toHaveBeenCalledWith('/billing/1/status', { status: 'paid' }, { signal: undefined });
    expect(result.status).toBe('paid');
  });

  it('getStats: GETs /billing/stats', async () => {
    const stats: BillingStats = {
      total_invoices: 5,
      pending_invoices: 2,
      paid_invoices: 3,
      overdue_invoices: 1,
      total_revenue: 500,
      pending_amount: 200,
      paid_amount: 300,
      overdue_amount: 50,
      invoices_last_30_days: 4,
    };
    apiClient.get.mockResolvedValue({ data: stats });
    const result = await billingService.getStats();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/stats', { signal: undefined });
    expect(result.total_revenue).toBe(500);
  });
});
