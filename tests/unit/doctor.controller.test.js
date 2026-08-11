import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getAllDoctors: vi.fn(),
  registerDoctor: vi.fn(),
  createDoctor: vi.fn(),
  invitePerson: vi.fn(),
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
      { id: 1, name: 'Dr. Test', specialty: 'General', email: 'hidden@test.com', user_id: 5 },
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
    const req = { query: {}, user: { role: 'admin' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.getDoctors(req, res, next);
    await flush();

    expect(doctorService.getAllDoctors).toHaveBeenCalledWith('t1');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Dr. Test' }]);
  });
});

describe('doctorController.registerDoctor', () => {
  it('registers doctor and returns 201 with message, doctor and email', async () => {
    vi.mocked(doctorService.registerDoctor).mockResolvedValue({
      doctor: { id: 1, name: 'Dr. Nuevo' },
      credentials: { email: 'new@test.com' },
    });
    const req = { body: { name: 'Dr. Nuevo', specialty: 'General', email: 'new@test.com' }, tenant_id: 't1' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    doctorController.registerDoctor(req, res, next);
    await flush();

    expect(doctorService.registerDoctor).toHaveBeenCalledWith(
      { name: 'Dr. Nuevo', specialty: 'General', email: 'new@test.com' },
      't1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Doctor registrado correctamente. Instrucciones enviadas por email.',
      doctor: { id: 1, name: 'Dr. Nuevo' },
      email: 'new@test.com',
    });
  });
});

describe('doctorController.createDoctor', () => {
  it('creates doctor and returns 201', async () => {
    vi.mocked(doctorService.createDoctor).mockResolvedValue({ id: 1, name: 'Dr. New' });
    const req = { body: { name: 'Dr. New', specialty: 'General' }, tenant_id: 't1' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    doctorController.createDoctor(req, res, next);
    await flush();

    expect(doctorService.createDoctor).toHaveBeenCalledWith({ name: 'Dr. New', specialty: 'General' }, 't1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Dr. New' });
  });
});

describe('doctorController.invitePerson', () => {
  it('invites person and returns 201', async () => {
    vi.mocked(doctorService.invitePerson).mockResolvedValue(undefined);
    const req = { body: { email: 'invite@test.com', role: 'patient' }, tenant_id: 't1' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    doctorController.invitePerson(req, res, next);
    await flush();

    expect(doctorService.invitePerson).toHaveBeenCalledWith(
      { email: 'invite@test.com', role: 'patient' },
      't1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invitación enviada correctamente' });
  });
});

describe('doctorController.getMyDoctorProfile', () => {
  it('returns the doctor profile', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1, name: 'Dr. Test' });
    const req = { user: { id: 5 }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.getMyDoctorProfile(req, res, next);
    await flush();

    expect(doctorService.getDoctorByUserId).toHaveBeenCalledWith(5, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Dr. Test' });
  });

  it('calls next with error when profile not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 5 }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.getMyDoctorProfile(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('doctorController.listUsers', () => {
  it('lists users with role and search filters', async () => {
    vi.mocked(doctorService.listTenantUsers).mockResolvedValue({ data: [{ id: 1 }], pagination: { page: 2, limit: 10, total: 25, totalPages: 3 } });
    const req = { tenant_id: 't1', query: { page: '2', limit: '10', role: 'doctor', search: 'ana' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.listUsers(req, res, next);
    await flush();

    expect(doctorService.listTenantUsers).toHaveBeenCalledWith('t1', 2, 10, { role: 'doctor', search: 'ana' });
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }], pagination: { page: 2, limit: 10, total: 25, totalPages: 3 } });
  });

  it('uses default page 1 and limit 20 without filters', async () => {
    vi.mocked(doctorService.listTenantUsers).mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    const req = { tenant_id: 't1', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.listUsers(req, res, next);
    await flush();

    expect(doctorService.listTenantUsers).toHaveBeenCalledWith('t1', 1, 20, { role: undefined, search: undefined });
  });
});

describe('doctorController.toggleUserActive', () => {
  it('toggles user active state', async () => {
    vi.mocked(doctorService.toggleUserActive).mockResolvedValue({ id: 1, active: false });
    const req = { params: { userId: '1' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    doctorController.toggleUserActive(req, res, next);
    await flush();

    expect(doctorService.toggleUserActive).toHaveBeenCalledWith(1, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 1, active: false });
  });
});
