import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

import { hasPermission, grantPermission, revokePermission, getUserPermissions } from '../../src/modules/rbac/rbac.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getUserPermissions', () => {
  it('returns permissions from role and user grants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ resource: 'user', action: 'read' }, { resource: 'user', action: 'create' }] })
      .mockResolvedValueOnce({ rows: [{ resource: 'user', action: 'create', granted: true }] });

    const result = await getUserPermissions(1, 'admin');

    expect(result).toContain('user:read');
    expect(result).toContain('user:create');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('handles denied permissions from user grants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ resource: 'user', action: 'read' }] })
      .mockResolvedValueOnce({ rows: [{ resource: 'user', action: 'read', granted: false }] });

    const result = await getUserPermissions(1, 'admin');

    expect(result).not.toContain('user:read');
  });

  it('includes tenant_id in query when provided', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await getUserPermissions(1, 'admin', 'tenant-1');

    expect(mockQuery.mock.calls[0][1]).toEqual(['admin', 'tenant-1']);
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
  });
});

describe('hasPermission', () => {
  it('returns true when permission is found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ resource: 'user', action: 'delete' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await hasPermission(1, 'admin', 'user:delete');

    expect(result).toBe(true);
  });

  it('returns false when permission is not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await hasPermission(1, 'user', 'admin:access');

    expect(result).toBe(false);
  });
});

describe('grantPermission', () => {
  it('grants permission without tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await grantPermission(1, 5);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_permissions'),
      [1, 5, true, null]
    );
  });

  it('grants permission with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await grantPermission(1, 5, null, 'tenant-1');

    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
  });

  it('grants permission with expiration', async () => {
    const expires = new Date('2026-12-31');
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await grantPermission(1, 5, expires);

    expect(mockQuery.mock.calls[0][1]).toContain(expires);
  });
});

describe('revokePermission', () => {
  it('revokes permission', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await revokePermission(1, 5);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      [1, 5]
    );
  });
});
