import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/clinical-templates/clinical-template.service.js', () => ({
  getAllTemplates: vi.fn(),
  getTemplateById: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

import * as templateService from '../../src/modules/clinical-templates/clinical-template.service.js';
import * as templateController from '../../src/modules/clinical-templates/clinical-template.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTemplates', () => {
  it('defaults limit to 100 when limit is not a number', async () => {
    vi.mocked(templateService.getAllTemplates).mockResolvedValue([]);
    const req = { tenant_id: 't1', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    templateController.getTemplates(req, res, next);
    await flush();
    expect(templateService.getAllTemplates).toHaveBeenCalledWith('t1', 100, 0);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('uses the provided limit and offset', async () => {
    vi.mocked(templateService.getAllTemplates).mockResolvedValue([{ id: 1 }]);
    const req = { tenant_id: 't1', query: { limit: '5', offset: '10' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    templateController.getTemplates(req, res, next);
    await flush();
    expect(templateService.getAllTemplates).toHaveBeenCalledWith('t1', 5, 10);
  });
});

describe('getTemplateById', () => {
  it('returns the template', async () => {
    vi.mocked(templateService.getTemplateById).mockResolvedValue({ id: 1 });
    const req = { params: { id: '1' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    templateController.getTemplateById(req, res, next);
    await flush();
    expect(templateService.getTemplateById).toHaveBeenCalledWith(1, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});

describe('createTemplate', () => {
  it('creates and returns 201', async () => {
    vi.mocked(templateService.createTemplate).mockResolvedValue({ id: 1 });
    const req = { tenant_id: 't1', body: { name: 'X', fields: [] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    templateController.createTemplate(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});

describe('updateTemplate', () => {
  it('updates passing the user id', async () => {
    vi.mocked(templateService.updateTemplate).mockResolvedValue({ id: 1 });
    const req = { params: { id: '1' }, body: { name: 'X' }, user: { id: 5 }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    templateController.updateTemplate(req, res, next);
    await flush();
    expect(templateService.updateTemplate).toHaveBeenCalledWith(1, { name: 'X' }, 5, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});

describe('deleteTemplate', () => {
  it('deletes a template', async () => {
    vi.mocked(templateService.deleteTemplate).mockResolvedValue({ message: 'Template deleted successfully' });
    const req = { params: { id: '1' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    templateController.deleteTemplate(req, res, next);
    await flush();
    expect(templateService.deleteTemplate).toHaveBeenCalledWith(1, 't1');
    expect(res.json).toHaveBeenCalledWith({ message: 'Template deleted successfully' });
  });
});
