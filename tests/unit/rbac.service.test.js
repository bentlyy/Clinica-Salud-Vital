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

import * as rbacService from '../../src/modules/rbac/rbac.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('rbacService.getUserPermissions', () => {
  it('returns permissions for admin role', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ resource: 'bookings', action: 'create' }, { resource: 'bookings', action: 'read' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await rbacService.getUserPermissions(1, 'admin');

    expect(result).toContain('bookings:create');
    expect(result).toContain('bookings:read');
  });

  it('applies user-level permission overrides', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ resource: 'bookings', action: 'read' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ resource: 'analytics', action: 'view', granted: true }, { resource: 'bookings', action: 'delete', granted: false }] });

    const result = await rbacService.getUserPermissions(1, 'user');

    expect(result).toContain('bookings:read');
    expect(result).toContain('analytics:view');
    expect(result).not.toContain('bookings:delete');
  });

  it('returns empty array for no permissions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await rbacService.getUserPermissions(1, 'user');

    expect(result).toEqual([]);
  });
});

describe('rbacService.hasPermission', () => {
  it('returns true if user has permission', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ resource: 'bookings', action: 'create' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await rbacService.hasPermission(1, 'admin', 'bookings:create');

    expect(result).toBe(true);
  });

  it('returns false if user lacks permission', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ resource: 'bookings', action: 'read' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await rbacService.hasPermission(1, 'user', 'bookings:create');

    expect(result).toBe(false);
  });
});

describe('rbacService.grantPermission', () => {
  it('grants permission to user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await rbacService.grantPermission(1, 5);

    expect(mockQuery).toHaveBeenCalledOnce();
  });
});

describe('rbacService.revokePermission', () => {
  it('revokes permission from user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await rbacService.revokePermission(1, 5);

    expect(mockQuery).toHaveBeenCalledOnce();
  });
});
