import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const ORIGINAL_ENV = { ...process.env };

describe('captcha.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const key of ['NODE_ENV', 'RECAPTCHA_SECRET_KEY']) {
      if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
      else process.env[key] = ORIGINAL_ENV[key];
    }
  });

  const load = async () => (await import('../../src/shared/captcha.service.js')).verifyRecaptcha;

  it('rejects in production when the secret is missing (fail-closed)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RECAPTCHA_SECRET_KEY;

    expect(await (await load())('token', 'login')).toBe(false);
  });

  it('allows development to continue when the secret is missing', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.RECAPTCHA_SECRET_KEY;

    expect(await (await load())('token', 'login')).toBe(true);
  });

  it('rejects in production when the Google TEST key is configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RECAPTCHA_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

    expect(await (await load())('token', 'login')).toBe(false);
  });

  it('rejects when a real secret is configured but no token is provided', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RECAPTCHA_SECRET_KEY = 'real-secret';

    expect(await (await load())('', 'register')).toBe(false);
  });

  it('returns true when Google responds with success', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RECAPTCHA_SECRET_KEY = 'real-secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }));

    expect(await (await load())('token', 'register')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('returns false when Google responds with failure', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RECAPTCHA_SECRET_KEY = 'real-secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }));

    expect(await (await load())('token', 'register')).toBe(false);
    vi.unstubAllGlobals();
  });

  it('returns false when the verification request throws (network/timeout)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RECAPTCHA_SECRET_KEY = 'real-secret';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(await (await load())('token', 'register')).toBe(false);
    vi.unstubAllGlobals();
  });
});
