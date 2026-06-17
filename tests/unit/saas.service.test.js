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

import { checkFeatureAccess, getTenantFeatures } from '../../src/modules/saas/saas.service.js';

describe('saasService.checkFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when tenant_features enables the feature', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });

    const result = await checkFeatureAccess('laboratory', 'tenant-1');

    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_features'),
      ['tenant-1', 'laboratory']
    );
  });

  it('returns false when tenant_features disables the feature', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: false }] });

    const result = await checkFeatureAccess('laboratory', 'tenant-1');

    expect(result).toBe(false);
  });

  it('falls back to plan features when no tenant_features override', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });

    const result = await checkFeatureAccess('analytics', 'tenant-1');

    expect(result).toBe(true);
  });

  it('returns false when no subscription or override exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: false }] });

    const result = await checkFeatureAccess('premium_feature', 'tenant-no-plan');

    expect(result).toBe(false);
  });
});

describe('saasService.getTenantFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all feature flags with correct values', async () => {
    mockQuery.mockResolvedValue({ rows: [{ enabled: true }] });

    const result = await getTenantFeatures('tenant-1');

    expect(result).toHaveProperty('bookings');
    expect(result).toHaveProperty('clinical_records');
    expect(result).toHaveProperty('laboratory');
    expect(result).toHaveProperty('analytics');
    expect(result).toHaveProperty('api_access');
    expect(result).toHaveProperty('white_label');
    expect(result).toHaveProperty('custom_domain');
    expect(result).toHaveProperty('sms');
    expect(result).toHaveProperty('advanced_reports');
  });

  it('returns all boolean values', async () => {
    mockQuery.mockResolvedValue({ rows: [{ enabled: true }] });

    const result = await getTenantFeatures('tenant-1');

    for (const value of Object.values(result)) {
      expect(typeof value).toBe('boolean');
    }
  });

  it('defaults to false for unmapped features', async () => {
    mockQuery.mockResolvedValue({ rows: [{ enabled: false }] });

    const result = await getTenantFeatures('tenant-1');

    expect(result.bookings).toBe(false);
  });
});
