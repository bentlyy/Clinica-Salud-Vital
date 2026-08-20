import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
  readPool: { query: mockQuery },
}));

import * as availabilityService from '../../src/modules/availability/availability.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
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

describe('availabilityService.bulkCreateAvailability', () => {
  const mockBulkClient = ({ overlapDays = [] } = {}) => {
    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return Promise.resolve({});
      if (sql.includes('FROM doctors WHERE id')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('SELECT 1 FROM doctor_availability')) {
        return Promise.resolve({ rows: overlapDays.includes(params[1]) ? [{ id: 1 }] : [] });
      }
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });
  };

  it('throws if missing required fields', async () => {
    await expect(availabilityService.bulkCreateAvailability({}, 'test-tenant')).rejects.toThrow('Missing required fields');
    await expect(availabilityService.bulkCreateAvailability({ doctor_id: 1, days: [] }, 'test-tenant')).rejects.toThrow('Missing required fields');
  });

  it('throws if doctor not found in tenant', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return Promise.resolve({});
      if (sql.includes('FROM doctors WHERE id')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(availabilityService.bulkCreateAvailability({
      doctor_id: 999,
      days: [{ day_of_week: 1, start_time: '09:00', end_time: '12:00' }],
    }, 'test-tenant')).rejects.toThrow('Doctor profile not found');
  });

  it('inserts all days in a transaction', async () => {
    mockBulkClient();

    const result = await availabilityService.bulkCreateAvailability({
      doctor_id: 1,
      days: [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
        { day_of_week: 3, start_time: '14:00', end_time: '17:00' },
      ],
    }, 'test-tenant');

    expect(result).toEqual({ inserted: 2, skipped: 0 });
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('skips days that overlap existing availability', async () => {
    mockBulkClient({ overlapDays: [3] });

    const result = await availabilityService.bulkCreateAvailability({
      doctor_id: 1,
      days: [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
        { day_of_week: 3, start_time: '14:00', end_time: '17:00' },
      ],
    }, 'test-tenant');

    expect(result).toEqual({ inserted: 1, skipped: 1 });
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('throws on invalid day_of_week', async () => {
    mockBulkClient();

    await expect(availabilityService.bulkCreateAvailability({
      doctor_id: 1,
      days: [{ day_of_week: 7, start_time: '09:00', end_time: '12:00' }],
    }, 'test-tenant')).rejects.toThrow('day_of_week must be an integer between 0 and 6');
  });

  it('throws on invalid time format', async () => {
    mockBulkClient();

    await expect(availabilityService.bulkCreateAvailability({
      doctor_id: 1,
      days: [{ day_of_week: 1, start_time: 'bad', end_time: '12:00' }],
    }, 'test-tenant')).rejects.toThrow('Invalid time format');
  });

  it('throws if start_time >= end_time', async () => {
    mockBulkClient();

    await expect(availabilityService.bulkCreateAvailability({
      doctor_id: 1,
      days: [{ day_of_week: 1, start_time: '14:00', end_time: '09:00' }],
    }, 'test-tenant')).rejects.toThrow('Invalid time range: start_time must be before end_time');
  });
});
