import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

import { logAction, getAuditLogs } from '../../src/modules/audit/audit.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUDIT_HMAC_SECRET = 'test-secret-32-chars-minimum-length!!';
});

describe('logAction', () => {
  it('logs action with null user_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await logAction({
      action: 'SYSTEM',
      resource_type: 'system',
    });

    const insertCall = mockQuery.mock.calls.find(c => c[0].startsWith('INSERT'));
    expect(insertCall[1][0]).toBeNull();
  });

  it('logs action without tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await logAction({
      user_id: 1,
      action: 'CREATE',
      resource_type: 'user',
      ip_address: '127.0.0.1',
    });

    const insertCall = mockQuery.mock.calls.find(c => c[0].startsWith('INSERT'));
    expect(insertCall[0]).not.toContain('tenant_id');
    expect(insertCall[1]).toContain(1);
    expect(insertCall[1]).toContain('CREATE');
    expect(insertCall[1]).toContain('user');
  });

  it('logs action with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await logAction({
      user_id: 1,
      action: 'CREATE',
      resource_type: 'user',
      tenant_id: 'tenant-1',
    });

    const insertCall = mockQuery.mock.calls.find(c => c[0].startsWith('INSERT'));
    expect(insertCall[0]).toContain('tenant_id');
    expect(insertCall[1]).toContain('tenant-1');
  });

  it('includes resource_id and new_values', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await logAction({
      user_id: 1,
      action: 'UPDATE',
      resource_type: 'booking',
      resource_id: 42,
      new_values: { status: 'confirmed' },
    });

    const insertCall = mockQuery.mock.calls.find(c => c[0].startsWith('INSERT'));
    expect(insertCall[1]).toContain(42);
    expect(insertCall[1]).toContain(JSON.stringify({ status: 'confirmed' }));
  });

  it('includes old_values, ip_address and user_agent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await logAction({
      user_id: 1,
      action: 'UPDATE',
      resource_type: 'booking',
      old_values: { status: 'pending' },
      new_values: { status: 'confirmed' },
      ip_address: '192.168.1.1',
      user_agent: 'TestAgent/1.0',
    });

    const insertCall = mockQuery.mock.calls.find(c => c[0].startsWith('INSERT'));
    expect(insertCall[1]).toContain(JSON.stringify({ status: 'pending' }));
    expect(insertCall[1]).toContain('192.168.1.1');
    expect(insertCall[1]).toContain('TestAgent/1.0');
  });
});

describe('getAuditLogs', () => {
  it('returns logs with pagination', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, action: 'CREATE' }] });

    const result = await getAuditLogs({ limit: 10, offset: 0 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by action and resource_type', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getAuditLogs({ action: 'DELETE', resource_type: 'user' });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('action');
    expect(sql).toContain('resource_type');
  });

  it('filters by date range', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getAuditLogs({ start_date: '2026-01-01', end_date: '2026-12-31' });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('created_at');
  });

  it('filters by tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getAuditLogs({ tenant_id: 'tenant-1' });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });

  it('filters by user_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getAuditLogs({ user_id: 1 });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('user_id');
    expect(mockQuery.mock.calls[0][1]).toContain(1);
  });
});
