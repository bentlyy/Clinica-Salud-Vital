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

import * as exceptionService from '../../src/modules/availability/availability.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exceptionService.getExceptionsByDoctor', () => {
  it('returns exceptions for doctor', async () => {
    const mockExceptions = [
      { id: 1, doctor_id: 1, date: '2025-01-20', is_full_day: true },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockExceptions });

    const result = await exceptionService.getExceptionsByDoctor(1, 'test-tenant');

    expect(result).toHaveLength(1);
    expect(result[0].is_full_day).toBe(true);
  });

  it('returns exceptions with tenantId filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, doctor_id: 1, date: '2025-01-20', is_full_day: true }] });

    const result = await exceptionService.getExceptionsByDoctor(1, 'tenant-1');

    expect(result).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });
});

describe('exceptionService.createException', () => {
  it('throws if missing required fields', async () => {
    await expect(exceptionService.createException({}, 'test-tenant')).rejects.toThrow('Missing required fields');
    await expect(exceptionService.createException({ doctor_id: 1 }, 'test-tenant')).rejects.toThrow('Missing required fields');
  });

  it('throws if date format invalid', async () => {
    await expect(exceptionService.createException({ doctor_id: 1, date: 'bad-date' }, 'test-tenant'))
      .rejects.toThrow('Invalid time format, use HH:MM');
  });

  it('throws if partial block missing times', async () => {
    await expect(exceptionService.createException({ doctor_id: 1, date: '2025-01-20' }, 'test-tenant'))
      .rejects.toThrow('Missing required fields');
  });

  it('throws if time format invalid', async () => {
    await expect(exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', start_time: 'bad', end_time: '12:00',
    }, 'test-tenant')).rejects.toThrow('Invalid time format');

    await expect(exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', start_time: '10:00', end_time: 'bad',
    }, 'test-tenant')).rejects.toThrow('Invalid time format');
  });

  it('throws if start_time >= end_time', async () => {
    await expect(exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', start_time: '14:00', end_time: '10:00',
    }, 'test-tenant')).rejects.toThrow('start_time must be before end_time');

    await expect(exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', start_time: '10:00', end_time: '10:00',
    }, 'test-tenant')).rejects.toThrow('start_time must be before end_time');
  });

  it('creates full day exception', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, doctor_id: 1, date: '2025-01-20', is_full_day: true }],
    });

    const result = await exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', is_full_day: true,
    }, 'test-tenant');

    expect(result.is_full_day).toBe(true);
  });

  it('creates partial day exception', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, doctor_id: 1, date: '2025-01-20', start_time: '10:00', end_time: '12:00', is_full_day: false }],
    });

    const result = await exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', start_time: '10:00', end_time: '12:00',
    }, 'test-tenant');

    expect(result.start_time).toBe('10:00');
    expect(result.is_full_day).toBe(false);
  });

  it('creates exception with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, doctor_id: 1, date: '2025-01-20', is_full_day: true }],
    });

    const result = await exceptionService.createException({
      doctor_id: 1, date: '2025-01-20', is_full_day: true,
    }, 'tenant-1');

    expect(result.is_full_day).toBe(true);
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });
});

describe('exceptionService.deleteException', () => {
  it('throws if ids not integers', async () => {
    await expect(exceptionService.deleteException('abc', 1, 'test-tenant')).rejects.toThrow('Invalid id');
    await expect(exceptionService.deleteException(1, 'abc', 'test-tenant')).rejects.toThrow('Invalid id');
  });

  it('deletes exception successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await exceptionService.deleteException(1, 1, 'test-tenant');

    expect(result.message).toBe('Exception deleted');
  });

  it('throws if exception not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(exceptionService.deleteException(999, 1, 'test-tenant')).rejects.toThrow('Availability not found or unauthorized');
  });

  it('deletes with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const result = await exceptionService.deleteException(1, 1, 'tenant-1');

    expect(result.message).toBe('Exception deleted');
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });
});