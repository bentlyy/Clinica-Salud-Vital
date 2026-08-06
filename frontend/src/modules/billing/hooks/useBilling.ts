import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from '../services/billing.service';
import type { InvoiceListParams, CreateInvoiceInput, UpdateInvoiceInput } from '../types/billing.types';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

const BILLING_KEYS = {
  all: ['billing'] as const,
  list: (params: InvoiceListParams) => [...BILLING_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...BILLING_KEYS.all, 'detail', id] as const,
  stats: () => [...BILLING_KEYS.all, 'stats'] as const,
};

export function useInvoiceList(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: BILLING_KEYS.list(params),
    queryFn: ({ signal }) => billingService.list(params, { signal }),
  });
}

export function useInvoiceDetail(id: number) {
  return useQuery({
    queryKey: BILLING_KEYS.detail(id),
    queryFn: ({ signal }) => billingService.getById(id, { signal }),
    enabled: id > 0,
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: BILLING_KEYS.stats(),
    queryFn: ({ signal }) => billingService.getStats({ signal }),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => billingService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.all });
      toast.success(i18n.t('billing:invoiceCreated'));
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateInvoiceInput }) =>
      billingService.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.detail(variables.id) });
      toast.success(i18n.t('billing:invoiceUpdated'));
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => billingService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.all });
      toast.success(i18n.t('billing:invoiceDeleted'));
    },
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => billingService.markAsPaid(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.detail(id) });
      toast.success(i18n.t('billing:invoicePaid'));
    },
  });
}
