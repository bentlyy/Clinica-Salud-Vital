import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/audit/audit.service.js', () => ({
  getAuditLogs: vi.fn(),
}));

import * as auditService from '../../src/modules/audit/audit.service.js';
import * as auditController from '../../src/modules/audit/audit.controller.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const mkRes = () => ({ json: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAuditLogs', () => {
  it('returns audit logs with query params', async () => {
    vi.mocked(auditService.getAuditLogs).mockResolvedValue([{ id: 1 }]);
    const req = {
      query: { user_id: '1', action: 'CREATE', resource_type: 'booking', start_date: '2026-01-01', end_date: '2026-06-01', limit: '50', offset: '0' },
      tenant_id: 't1',
    };
    const res = mkRes();

    auditController.getAuditLogs(req, res, vi.fn());
    await flush();

    expect(auditService.getAuditLogs).toHaveBeenCalledWith({
      tenant_id: 't1',
      user_id: 1,
      action: 'CREATE',
      resource_type: 'booking',
      start_date: '2026-01-01',
      end_date: '2026-06-01',
      limit: 50,
      offset: 0,
    });
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('returns audit logs with default values when params missing', async () => {
    vi.mocked(auditService.getAuditLogs).mockResolvedValue([]);
    const req = { query: {}, tenant_id: 't1' };
    const res = mkRes();

    auditController.getAuditLogs(req, res, vi.fn());
    await flush();

    expect(auditService.getAuditLogs).toHaveBeenCalledWith({
      tenant_id: 't1',
      user_id: undefined,
      action: undefined,
      resource_type: undefined,
      start_date: undefined,
      end_date: undefined,
      limit: 100,
      offset: 0,
    });
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
