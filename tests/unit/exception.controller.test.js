import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/availability/availability.service.js', () => ({
  getExceptionsByDoctor: vi.fn(),
  createException: vi.fn(),
  deleteException: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

import * as exceptionService from '../../src/modules/availability/availability.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as exceptionController from '../../src/modules/availability/availability.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exceptionController.getMyExceptions', () => {
  it('returns exceptions for doctor', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1, name: 'Dr. Test' });
    vi.mocked(exceptionService.getExceptionsByDoctor).mockResolvedValue([{ id: 1, date: '2025-01-20' }]);
    const req = { user: { id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    exceptionController.getMyExceptions(req, res, next);
    await flush();
    expect(exceptionService.getExceptionsByDoctor).toHaveBeenCalledWith(1, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, date: '2025-01-20' }]);
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    exceptionController.getMyExceptions(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('exceptionController.createException', () => {
  it('creates exception and returns 201', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(exceptionService.createException).mockResolvedValue({ id: 1, date: '2025-01-20' });
    const req = { user: { id: 1 }, tenant_id: 'test', body: { date: '2025-01-20', is_full_day: true } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    exceptionController.createException(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, date: '2025-01-20' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, tenant_id: 'test', body: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    exceptionController.createException(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('exceptionController.deleteException', () => {
  it('deletes exception', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(exceptionService.deleteException).mockResolvedValue({ message: 'Exception deleted' });
    const req = { user: { id: 1 }, tenant_id: 'test', params: { id: '1' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    exceptionController.deleteException(req, res, next);
    await flush();
    expect(exceptionService.deleteException).toHaveBeenCalledWith(1, 1, 'test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Exception deleted' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, params: { id: '1' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    exceptionController.deleteException(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
