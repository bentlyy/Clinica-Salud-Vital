import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Invoice, BillingStats, CreateInvoiceInput, UpdateInvoiceInput } from '@/modules/billing/types/billing.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const billingService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  getStats: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  markAsPaid: vi.fn(),
}));

vi.mock('@/modules/billing/services/billing.service', () => ({ billingService }));

import {
  useInvoiceList,
  useInvoiceDetail,
  useBillingStats,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  usePayInvoice,
} from '@/modules/billing/hooks/useBilling';

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
  items: [],
  created_at: '2026-08-01T10:00:00Z',
};

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useBilling hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useInvoiceList: fetches the invoice list with params', async () => {
    billingService.list.mockResolvedValue({ data: [invoice], total: 1, page: 1, limit: 10, totalPages: 1 });
    const { result } = renderHook(() => useInvoiceList({ page: 1, limit: 10 }), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(billingService.list).toHaveBeenCalled();
    expect(result.current.data?.data).toEqual([invoice]);
    expect(result.current.data?.total).toBe(1);
  });

  it('useInvoiceDetail: stays disabled for ids <= 0', () => {
    const { result } = renderHook(() => useInvoiceDetail(0), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(billingService.getById).not.toHaveBeenCalled();
  });

  it('useInvoiceDetail: fetches detail when id > 0', async () => {
    billingService.getById.mockResolvedValue(invoice);
    const { result } = renderHook(() => useInvoiceDetail(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(billingService.getById).toHaveBeenCalledWith(1, expect.any(Object));
    expect(result.current.data).toEqual(invoice);
  });

  it('useBillingStats: fetches stats', async () => {
    billingService.getStats.mockResolvedValue(stats);
    const { result } = renderHook(() => useBillingStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });

  it('useCreateInvoice: creates the invoice, invalidates queries and toasts', async () => {
    billingService.create.mockResolvedValue(invoice);
    const { result } = renderHook(() => useCreateInvoice(), { wrapper: createWrapper() });

    const input: CreateInvoiceInput = {
      patient_id: 10,
      items: [{ description: 'Consulta', quantity: 1, unit_price: 100, total: 100 }],
      tax: 19,
      due_date: '2026-08-15',
    };
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(billingService.create).toHaveBeenCalledWith(input);
    expect(toast.success).toHaveBeenCalledWith('[billing:invoiceCreated]');
  });

  it('useUpdateInvoice: updates the invoice and toasts', async () => {
    billingService.update.mockResolvedValue({ ...invoice, status: 'paid' });
    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    const input: UpdateInvoiceInput = { status: 'paid' };
    result.current.mutate({ id: 1, input });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(billingService.update).toHaveBeenCalledWith(1, input);
    expect(toast.success).toHaveBeenCalledWith('[billing:invoiceUpdated]');
  });

  it('usePayInvoice: marks as paid and toasts', async () => {
    billingService.markAsPaid.mockResolvedValue({ ...invoice, status: 'paid' });
    const { result } = renderHook(() => usePayInvoice(), { wrapper: createWrapper() });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(billingService.markAsPaid).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('[billing:invoicePaid]');
  });

  it('useDeleteInvoice: removes the invoice and toasts', async () => {
    billingService.remove.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteInvoice(), { wrapper: createWrapper() });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(billingService.remove).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('[billing:invoiceDeleted]');
  });
});
