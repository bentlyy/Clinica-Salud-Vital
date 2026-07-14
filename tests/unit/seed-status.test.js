import { describe, it, expect, vi, beforeEach } from 'vitest';

const mod = await import('../../src/shared/seed-status.js');

describe('seed-status', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('waitForSeed resolves when markSeedComplete is called', async () => {
    const { markSeedComplete, waitForSeed } = await import('../../src/shared/seed-status.js');
    markSeedComplete();
    const result = await waitForSeed(1000);
    expect(result).toBe(true);
  });

  it('waitForSeed returns false on timeout', async () => {
    const { waitForSeed } = await import('../../src/shared/seed-status.js');
    const result = await waitForSeed(10);
    expect(result).toBe(false);
  });

  it('waitForSeed returns false when markSeedFailed is called', async () => {
    const { markSeedFailed, waitForSeed } = await import('../../src/shared/seed-status.js');
    markSeedFailed(new Error('DB error'));
    const result = await waitForSeed(1000);
    expect(result).toBe(false);
  });
});
