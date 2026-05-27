import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/audit/audit.service.js', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { auditMiddleware } from '../../src/modules/audit/audit.middleware.js';

let req, res, next;

beforeEach(() => {
  vi.clearAllMocks();
  req = {
    user: { id: 1 },
    params: {},
    method: 'POST',
    body: { name: 'test' },
    ip: '127.0.0.1',
    get: vi.fn().mockReturnValue('test-agent'),
    tenant_id: 'tenant-1',
  };
  res = { json: vi.fn() };
  next = vi.fn();
});

describe('auditMiddleware', () => {
  it('logs action and calls res.json then next', async () => {
    const middleware = auditMiddleware('CREATE', 'user');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();

    const body = { id: 5 };
    res.json(body);

    const { logAction } = await import('../../src/modules/audit/audit.service.js');
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 1,
        action: 'CREATE',
        resource_type: 'user',
        ip_address: '127.0.0.1',
        tenant_id: 'tenant-1',
      })
    );
  });

  it('uses resource ID from params when no getIdFromResponse', async () => {
    req.params.id = '42';
    req.method = 'PUT';

    const middleware = auditMiddleware('UPDATE', 'user');
    middleware(req, res, next);
    res.json({ success: true });

    const { logAction } = await import('../../src/modules/audit/audit.service.js');
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: 42, new_values: { name: 'test' } })
    );
  });

  it('extracts resource ID from response body via getIdFromResponse', async () => {
    const getIdFromResponse = vi.fn((body) => String(body.newId));
    const middleware = auditMiddleware('CREATE', 'doctor', getIdFromResponse);

    middleware(req, res, next);
    res.json({ newId: 99 });

    expect(getIdFromResponse).toHaveBeenCalledWith({ newId: 99 });
    const { logAction } = await import('../../src/modules/audit/audit.service.js');
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: 99 })
    );
  });

  it('sets new_values to null for GET method', async () => {
    req.method = 'GET';

    const middleware = auditMiddleware('READ', 'user');
    middleware(req, res, next);
    res.json({ data: [] });

    const { logAction } = await import('../../src/modules/audit/audit.service.js');
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ new_values: null })
    );
  });

  it('handles logAction rejection gracefully', async () => {
    const { logAction } = await import('../../src/modules/audit/audit.service.js');
    logAction.mockRejectedValue(new Error('DB error'));

    const middleware = auditMiddleware('DELETE', 'user');
    middleware(req, res, next);
    res.json({ success: true });

    await new Promise(resolve => setTimeout(resolve, 0));
    const { logger } = await import('../../src/utils/logger.js');
    expect(logger.error).toHaveBeenCalledWith('Audit log error:', expect.any(Error));
  });
});
