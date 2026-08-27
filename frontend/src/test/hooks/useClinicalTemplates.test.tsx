import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const clinicalTemplateService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/modules/clinical-templates/services/clinical-template.service', () => ({
  clinicalTemplateService,
}));

import {
  useClinicalTemplates,
  useClinicalTemplateDetail,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '@/modules/clinical-templates/hooks/useClinicalTemplates';
import type { ClinicalTemplate } from '@/modules/clinical-templates/types/template.types';

const template: ClinicalTemplate = {
  id: 1,
  tenant_id: 1,
  name: 'Consulta General',
  fields: [{ name: 'diagnosis', type: 'textarea', required: true }],
  created_at: '2026-08-01T10:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useClinicalTemplates hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useClinicalTemplates: fetches templates on mount', async () => {
    clinicalTemplateService.list.mockResolvedValue({ data: [template], total: 1, page: 1, limit: 10, totalPages: 1 });
    const { result } = renderHook(() => useClinicalTemplates(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clinicalTemplateService.list).toHaveBeenCalled();
    expect(result.current.data).toEqual({ data: [template], total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('useClinicalTemplateDetail: fetches the template when id is valid', async () => {
    clinicalTemplateService.getById.mockResolvedValue(template);
    const { result } = renderHook(() => useClinicalTemplateDetail(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clinicalTemplateService.getById).toHaveBeenCalled();
    expect(result.current.data).toEqual(template);
  });

  it('useClinicalTemplateDetail: does not fetch when id is null', async () => {
    const { result } = renderHook(() => useClinicalTemplateDetail(null), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(clinicalTemplateService.getById).not.toHaveBeenCalled();
  });

  it('useCreateTemplate: creates a template, invalidates queries and toasts', async () => {
    clinicalTemplateService.create.mockResolvedValue(template);
    const { result } = renderHook(() => useCreateTemplate(), { wrapper: createWrapper() });

    result.current.mutate({
      name: 'Consulta General',
      fields: [{ name: 'diagnosis', type: 'textarea', required: true }],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clinicalTemplateService.create).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('[clinical_templates:created]');
  });

  it('useUpdateTemplate: updates a template and toasts', async () => {
    clinicalTemplateService.update.mockResolvedValue(template);
    const { result } = renderHook(() => useUpdateTemplate(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, input: { name: 'Nuevo nombre' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clinicalTemplateService.update).toHaveBeenCalledWith(1, { name: 'Nuevo nombre' });
    expect(toast.success).toHaveBeenCalledWith('[clinical_templates:updated]');
  });

  it('useDeleteTemplate: removes a template and toasts', async () => {
    clinicalTemplateService.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteTemplate(), { wrapper: createWrapper() });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clinicalTemplateService.remove).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('[clinical_templates:deleted]');
  });
});
