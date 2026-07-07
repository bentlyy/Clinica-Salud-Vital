import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCheckFeatureAccess = vi.hoisted(() => vi.fn());

vi.mock('../../src/modules/saas/saas.service.js', () => ({
  checkFeatureAccess: mockCheckFeatureAccess,
}));

import { requireFeature } from '../../src/middlewares/feature.middleware.js';

describe('requireFeature middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { tenant_id: 'test-tenant' };
    res = {};
    next = vi.fn();
  });

  it('calls next() when feature is enabled', async () => {
    mockCheckFeatureAccess.mockResolvedValueOnce(true);

    const middleware = requireFeature('laboratory');
    await middleware(req, res, next);

    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('laboratory', 'test-tenant');
    expect(next).toHaveBeenCalled();
  });

  it('calls next with ForbiddenError when feature is disabled', async () => {
    mockCheckFeatureAccess.mockResolvedValueOnce(false);

    const middleware = requireFeature('laboratory');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('requiere un plan superior'),
    }));
  });

  it('passes the correct feature key to checkFeatureAccess', async () => {
    mockCheckFeatureAccess.mockResolvedValueOnce(true);

    const middleware = requireFeature('analytics');
    await middleware(req, res, next);

    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('analytics', 'test-tenant');
  });
});
