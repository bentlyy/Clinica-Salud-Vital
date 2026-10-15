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
  tax_amount: 19,
  discount_amount: 0,
  total_amount: 119,
  status: 'pending',
  due_date: '2026-08-15',
  items: [{ description: 'Consulta', quantity: 1, unit_price: 100, total: 100 }],
  created_at: '2026-08-01T10:00:00Z',
  patient_name: 'Maria Garcia',
} as any;

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
    const input: any = {
      patient_id: 10,
      items: invoice.items,
      tax_amount: 19,
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
      total_outstanding: 200,
      total_paid: 300,
      overdue_invoices: 1,
    } as any;
    apiClient.get.mockResolvedValue({ data: stats });
    const result = await billingService.getStats();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/stats', { signal: undefined });
    expect((result as any).total_paid).toBe(300);
  });
});
