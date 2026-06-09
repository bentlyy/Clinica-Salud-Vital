import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
}));

import * as availabilityService from '../../src/modules/availability/availability.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('availabilityService.getAvailabilityByDoctor', () => {
  it('returns availability for a doctor', async () => {
    const mockRows = [
      { id: 1, doctor_id: 1, day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' },
      { id: 2, doctor_id: 1, day_of_week: 3, start_time: '14:00:00', end_time: '17:00:00' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockRows });

    const result = await availabilityService.getAvailabilityByDoctor(1, 'test-tenant');

    expect(result).toHaveLength(2);
    expect(result[0].day_of_week).toBe(1);
    expect(result[1].day_of_week).toBe(3);
  });

  it('returns empty array if no availability', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await availabilityService.getAvailabilityByDoctor(999, 'test-tenant');

    expect(result).toEqual([]);
  });

  it('returns availability with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_id: 1, day_of_week: 1 }] });

    const result = await availabilityService.getAvailabilityByDoctor(1, 'tenant-1');

    expect(result).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });
});

describe('availabilityService.createAvailability', () => {
  it('throws if missing required fields', async () => {
    await expect(availabilityService.createAvailability({}, 'test-tenant')).rejects.toThrow('Missing required fields');
    await expect(availabilityService.createAvailability({ doctor_id: 1 }, 'test-tenant')).rejects.toThrow('Missing required fields');
  });

  it('throws if day_of_week out of range', async () => {
    await expect(availabilityService.createAvailability({
      doctor_id: 1, day_of_week: 7, start_time: '09:00', end_time: '12:00',
    }, 'test-tenant')).rejects.toThrow('day_of_week must be an integer between 0 and 6');
  });

  it('throws if invalid time format', async () => {
    await expect(availabilityService.createAvailability({
      doctor_id: 1, day_of_week: 1, start_time: 'bad', end_time: '12:00',
    }, 'test-tenant')).rejects.toThrow('Invalid time format');
  });

  it('throws if start_time >= end_time', async () => {
    await expect(availabilityService.createAvailability({
      doctor_id: 1, day_of_week: 1, start_time: '14:00', end_time: '09:00',
    }, 'test-tenant')).rejects.toThrow('Invalid time range: start_time must be before end_time');
  });

  it('detects overlapping slots', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await expect(availabilityService.createAvailability({
      doctor_id: 1, day_of_week: 1, start_time: '10:00', end_time: '11:00',
    }, 'test-tenant')).rejects.toThrow('Time range overlaps with existing availability');
  });

  it('creates availability successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_id: 1, day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' }] });

    const result = await availabilityService.createAvailability({
      doctor_id: 1, day_of_week: 1, start_time: '09:00', end_time: '12:00',
    }, 'test-tenant');

    expect(result.id).toBe(1);
    expect(result.doctor_id).toBe(1);
  });
});

describe('availabilityService.deleteAvailability', () => {
  it('throws if invalid id', async () => {
    await expect(availabilityService.deleteAvailability('abc', 1, 'test-tenant')).rejects.toThrow('Invalid id');
  });

  it('throws if availability not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(availabilityService.deleteAvailability(999, 1, 'test-tenant')).rejects.toThrow('Availability not found');
  });

  it('deletes availability successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await availabilityService.deleteAvailability(1, 1, 'test-tenant');

    expect(result.message).toBe('Availability deleted');
  });

  it('creates availability with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_id: 1, day_of_week: 1, start_time: '09:00:00', end_time: '12:00:00' }] });

    const result = await availabilityService.createAvailability({
      doctor_id: 1, day_of_week: 1, start_time: '09:00', end_time: '12:00',
    }, 'tenant-1');

    expect(result.id).toBe(1);
    expect(mockQuery.mock.calls[1][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[1][1]).toContain('tenant-1');
  });

  it('deletes availability with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await availabilityService.deleteAvailability(1, 1, 'tenant-1');

    expect(result.message).toBe('Availability deleted');
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });
});
