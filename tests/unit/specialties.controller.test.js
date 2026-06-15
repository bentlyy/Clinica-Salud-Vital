import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/specialties/specialties.service.js', () => ({
  getAllSpecialties: vi.fn(),
}));

import * as specialtiesService from '../../src/modules/specialties/specialties.service.js';
import * as specialtiesController from '../../src/modules/specialties/specialties.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('specialtiesController.getSpecialties', () => {
  it('returns all specialties', async () => {
    vi.mocked(specialtiesService.getAllSpecialties).mockResolvedValue([{ id: 1, name: 'Cardiology' }]);
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();

    specialtiesController.getSpecialties(req, res, next);
    await flush();

    expect(specialtiesService.getAllSpecialties).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Cardiology' }]);
  });
});
