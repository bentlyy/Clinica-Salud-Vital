import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/shared/i18n.service.js', () => ({
  getTranslations: vi.fn(),
}));

import { getTranslations } from '../../src/shared/i18n.service.js';
import { getTranslationsHandler } from '../../src/modules/i18n/i18n.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTranslationsHandler', () => {
  it('returns translations from service', async () => {
    const mockTranslations = { es: { hello: 'Hola' }, en: { hello: 'Hello' } };
    vi.mocked(getTranslations).mockReturnValue(mockTranslations);

    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();

    getTranslationsHandler(req, res, next);
    await flush();
    expect(getTranslations).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(mockTranslations);
  });

  it('calls getTranslations once per request', async () => {
    vi.mocked(getTranslations).mockReturnValue({});

    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();

    getTranslationsHandler(req, res, next);
    await flush();
    expect(getTranslations).toHaveBeenCalledTimes(1);
  });
});
