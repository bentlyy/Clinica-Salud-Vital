import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { reportService } from '@/modules/reports/services/report.service';

const available = [
  { type: 'appointments', label: 'Citas', description: '…', icon: '📅' },
  { type: 'revenue', label: 'Ingresos', description: '…', icon: '💰' },
];

const report = {
  id: 1,
  tenant_id: 1,
  type: 'appointments',
  status: 'generating',
  config: { type: 'appointments', date_from: '2026-07-01', date_to: '2026-07-31' },
  created_at: '2026-08-01T10:00:00Z',
};

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailable', () => {
    it('calls GET /reports/available and returns the payload', async () => {
      apiClient.get.mockResolvedValue({ data: available });

      const result = await reportService.getAvailable();

      expect(apiClient.get).toHaveBeenCalledWith('/reports/available', { signal: undefined });
      expect(result).toEqual(available);
    });
  });

  describe('generate', () => {
    it('posts the input to /reports/generate', async () => {
      const input = { type: 'revenue' as const, date_from: '2026-07-01', date_to: '2026-07-31' };
      apiClient.post.mockResolvedValue({ data: { ...report, type: 'revenue' } });

      const result = await reportService.generate(input);

      expect(apiClient.post).toHaveBeenCalledWith('/reports/generate', input, { signal: undefined });
      expect(result.id).toBe(1);
    });
  });

  describe('getById', () => {
    it('calls GET /reports/:id', async () => {
      apiClient.get.mockResolvedValue({ data: report });

      const result = await reportService.getById(1);

      expect(apiClient.get).toHaveBeenCalledWith('/reports/1', { signal: undefined });
      expect(result.status).toBe('generating');
    });
  });
});
