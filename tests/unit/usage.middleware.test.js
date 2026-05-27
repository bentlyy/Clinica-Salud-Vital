import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/saas/saas.service.js', () => ({
  recordUsage: vi.fn().mockResolvedValue(undefined),
}));

import { usageTracking } from '../../src/shared/usage.middleware.js';
import * as saasService from '../../src/modules/saas/saas.service.js';

let req, res, next;

beforeEach(() => {
  vi.clearAllMocks();
  req = { tenant_id: 'tenant-1' };
  res = {};
  next = vi.fn();
});

describe('usageTracking', () => {
  it('records usage with given metric and default value', () => {
    const middleware = usageTracking('api_calls');
    middleware(req, res, next);

    expect(saasService.recordUsage).toHaveBeenCalledWith('tenant-1', 'api_calls', 1);
    expect(next).toHaveBeenCalled();
  });

  it('records usage with custom value', () => {
    const middleware = usageTracking('storage', 100);
    middleware(req, res, next);

    expect(saasService.recordUsage).toHaveBeenCalledWith('tenant-1', 'storage', 100);
    expect(next).toHaveBeenCalled();
  });

  it('uses default tenant when tenant_id is missing', () => {
    req = {};
    const middleware = usageTracking('api_calls');
    middleware(req, res, next);

    expect(saasService.recordUsage).toHaveBeenCalledWith('default', 'api_calls', 1);
    expect(next).toHaveBeenCalled();
  });

  it('does not throw when recordUsage rejects', async () => {
    vi.mocked(saasService.recordUsage).mockRejectedValue(new Error('DB error'));

    const middleware = usageTracking('api_calls');
    expect(() => middleware(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});
