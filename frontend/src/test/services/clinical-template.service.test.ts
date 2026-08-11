import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClinicalTemplate, CreateTemplateInput, UpdateTemplateInput } from '@/modules/clinical-templates/types/template.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { clinicalTemplateService } from '@/modules/clinical-templates/services/clinical-template.service';

const template: ClinicalTemplate = {
  id: 1,
  tenant_id: 1,
  name: 'Consulta General',
  specialty: 'Medicina General',
  fields: [{ name: 'diagnosis', type: 'textarea', required: true }],
  created_at: '2026-08-01T10:00:00Z',
};

describe('clinicalTemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list: GETs /clinical-templates with signal', async () => {
    apiClient.get.mockResolvedValue({ data: { items: [template], total: 1 } });
    const signal = new AbortController().signal;
    const result = await clinicalTemplateService.list({ signal });
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-templates', { signal });
    expect(result.items).toEqual([template]);
  });

  it('getById: GETs /clinical-templates/:id', async () => {
    apiClient.get.mockResolvedValue({ data: template });
    const result = await clinicalTemplateService.getById(1);
    expect(apiClient.get).toHaveBeenCalledWith('/clinical-templates/1', { signal: undefined });
    expect(result).toEqual(template);
  });

  it('create: POSTs /clinical-templates with input', async () => {
    apiClient.post.mockResolvedValue({ data: template });
    const input: CreateTemplateInput = {
      name: 'Consulta General',
      fields: [{ name: 'diagnosis', type: 'textarea', required: true }],
    };
    const result = await clinicalTemplateService.create(input);
    expect(apiClient.post).toHaveBeenCalledWith('/clinical-templates', input, { signal: undefined });
    expect(result).toEqual(template);
  });

  it('update: PATCHes /clinical-templates/:id with input', async () => {
    apiClient.patch.mockResolvedValue({ data: { ...template, name: 'Consulta Actualizada' } });
    const input: UpdateTemplateInput = { name: 'Consulta Actualizada' };
    const result = await clinicalTemplateService.update(1, input);
    expect(apiClient.patch).toHaveBeenCalledWith('/clinical-templates/1', input, { signal: undefined });
    expect(result.name).toBe('Consulta Actualizada');
  });

  it('remove: DELETEs /clinical-templates/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: {} });
    await clinicalTemplateService.remove(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/clinical-templates/1', { signal: undefined });
  });
});
