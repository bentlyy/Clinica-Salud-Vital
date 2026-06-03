import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getAllDoctors: vi.fn(),
  registerDoctor: vi.fn(),
  createDoctor: vi.fn(),
  getDoctorByUserId: vi.fn(),
  listTenantUsers: vi.fn(),
  toggleUserActive: vi.fn(),
}));

import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as doctorController from '../../src/modules/doctor/doctor.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('doctorController.getDoctorsPublic', () => {
  it('returns public doctor info (safe fields only)', async () => {
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue([
      { id: 1, name: 'Dr. Test', specialty: 'General', email: 'hidden@test.com' },
    ]);
    const req = { query: {}, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.getDoctorsPublic(req, res, next);
    await flush();

    expect(doctorService.getAllDoctors).toHaveBeenCalledWith('t1');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Dr. Test', specialty: 'General' }]);
  });
});

describe('doctorController.getDoctors', () => {
  it('returns all doctors', async () => {
    vi.mocked(doctorService.getAllDoctors).mockResolvedValue([{ id: 1, name: 'Dr. Test' }]);
    const req = { query: {}, user: { role: 'admin' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.getDoctors(req, res, next);
    await flush();

    expect(doctorService.getAllDoctors).toHaveBeenCalledWith(undefined);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Dr. Test' }]);
  });
});

describe('doctorController.createDoctor', () => {
  it('creates doctor and returns 201', async () => {
    vi.mocked(doctorService.createDoctor).mockResolvedValue({ id: 1, name: 'Dr. New' });
    const req = { body: { name: 'Dr. New', specialty: 'General' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    doctorController.createDoctor(req, res, next);
    await flush();

    expect(doctorService.createDoctor).toHaveBeenCalledWith({ name: 'Dr. New', specialty: 'General' }, undefined);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Dr. New' });
  });
});
