import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../../src/modules/clinical-templates/clinical-template.service.js';
import { NotFoundError } from '../../src/utils/errors.js';

const templateRow = {
  id: 1,
  name: 'Consulta general',
  specialty: 'Medicina',
  fields: [{ name: 'nota', type: 'text', required: true }],
  tenant_id: 't1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const baseData = {
  name: 'Consulta general',
  fields: [{ name: 'nota', type: 'text', required: true }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAllTemplates', () => {
  it('queries with default limit and offset if not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    const rows = await getAllTemplates('t1');
    expect(rows).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['t1', 100, 0]);
  });

  it('queries with explicit limit and offset', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getAllTemplates('t1', 10, 20);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['t1', 10, 20]);
  });
});

describe('getTemplateById', () => {
  it('returns the template when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    const template = await getTemplateById(1, 't1');
    expect(template.id).toBe(1);
  });

  it('throws NotFoundError when the template does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getTemplateById(1, 't1')).rejects.toThrow(NotFoundError);
  });
});

describe('createTemplate', () => {
  it('stores the specialty when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    const template = await createTemplate({ ...baseData, specialty: 'Medicina' }, 't1');
    expect(template.id).toBe(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['Consulta general', 'Medicina', expect.any(String), 't1']);
  });

  it('stores null specialty when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    await createTemplate(baseData, 't1');
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['Consulta general', null, expect.any(String), 't1']);
  });
});

describe('updateTemplate', () => {
  it('throws NotFoundError when the template does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(updateTemplate(1, { name: 'X' }, 1, 't1')).rejects.toThrow(NotFoundError);
  });

  it('updates only the provided present fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    await updateTemplate(1, { name: 'Nuevo nombre', specialty: 'Cardiología', fields: [{ name: 'a', type: 'text', required: false }] }, 1, 't1');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const updateCall = mockQuery.mock.calls[1][1];
    expect(updateCall).toContain('Nuevo nombre');
    expect(updateCall).toContain('Cardiología');
  });

  it('returns the existing template when no fields are provided for update', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    const template = await updateTemplate(1, {}, 1, 't1');
    expect(template.id).toBe(1);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('builds the update clause with only the provided field', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [templateRow] });
    await updateTemplate(1, { name: 'Solo nombre' }, 1, 't1');
    const updateCall = mockQuery.mock.calls[1][1];
    expect(updateCall[0]).toBe('Solo nombre');
  });
});

describe('deleteTemplate', () => {
  it('deletes an existing template', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await deleteTemplate(1, 't1');
    expect(result.message).toBe('Template deleted successfully');
  });

  it('throws NotFoundError when the template does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(deleteTemplate(1, 't1')).rejects.toThrow(NotFoundError);
  });
});
