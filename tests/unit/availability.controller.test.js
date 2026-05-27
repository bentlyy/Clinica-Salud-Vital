import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/availability/availability.service.js', () => ({
  getAvailabilityByDoctor: vi.fn(),
  createAvailability: vi.fn(),
  deleteAvailability: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

import * as availabilityService from '../../src/modules/availability/availability.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as availabilityController from '../../src/modules/availability/availability.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('availabilityController.getAvailabilityByDoctor', () => {
  it('returns availability by doctor id', async () => {
    vi.mocked(availabilityService.getAvailabilityByDoctor).mockResolvedValue([{ id: 1, day_of_week: 1 }]);
    const req = { params: { id: '1' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    availabilityController.getAvailabilityByDoctor(req, res, next);
    await flush();
    expect(availabilityService.getAvailabilityByDoctor).toHaveBeenCalledWith(1, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, day_of_week: 1 }]);
  });
});

describe('availabilityController.getMyAvailability', () => {
  it('returns availability for logged in doctor', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(availabilityService.getAvailabilityByDoctor).mockResolvedValue([{ id: 1, day_of_week: 1 }]);
    const req = { user: { id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    availabilityController.getMyAvailability(req, res, next);
    await flush();
    expect(availabilityService.getAvailabilityByDoctor).toHaveBeenCalledWith(1, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, day_of_week: 1 }]);
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    availabilityController.getMyAvailability(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('availabilityController.createAvailability', () => {
  it('creates availability and returns 201', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(availabilityService.createAvailability).mockResolvedValue({ id: 1, day_of_week: 1 });
    const req = { user: { id: 1 }, tenant_id: 'test', body: { day_of_week: 1, start_time: '09:00', end_time: '12:00' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    availabilityController.createAvailability(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, day_of_week: 1 });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, body: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    availabilityController.createAvailability(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('availabilityController.deleteAvailability', () => {
  it('deletes availability', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(availabilityService.deleteAvailability).mockResolvedValue({ message: 'Availability deleted' });
    const req = { user: { id: 1 }, tenant_id: 'test', params: { id: '1' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    availabilityController.deleteAvailability(req, res, next);
    await flush();
    expect(availabilityService.deleteAvailability).toHaveBeenCalledWith(1, 1, 'test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Availability deleted' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, params: { id: '1' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    availabilityController.deleteAvailability(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
