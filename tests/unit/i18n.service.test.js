import { describe, it, expect, beforeEach } from 'vitest';
import { t, tAll, translate, getLocale, setLocale, getTranslations } from '../../src/shared/i18n.service.js';

beforeEach(() => {
  setLocale('es');
});

describe('i18n.t()', () => {
  it('returns Spanish translation by default', () => {
    expect(t('app.name')).toBe('Salud Vital');
  });

  it('returns English translation when locale specified', () => {
    expect(t('app.name', 'en')).toBe('Salud Vital');
  });

  it('replaces params in translation', () => {
    const result = t('booking.logged_in_as', 'es', { email: 'test@test.com' });
    expect(result).toBe('Sesión iniciada como test@test.com');
  });

  it('returns key when translation not found', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('falls back to es when locale not found', () => {
    expect(t('app.name', 'fr')).toBe('Salud Vital');
  });

  it('handles deprecated pt locale', () => {
    setLocale('pt');
    expect(t('app.name')).toBe('Salud Vital');
  });
});

describe('i18n.tAll()', () => {
  it('returns translations for all active locales', () => {
    const result = tAll('app.name');
    expect(result.es).toBe('Salud Vital');
    expect(result.en).toBe('Salud Vital');
  });

  it('returns key when not found in any locale', () => {
    const result = tAll('nonexistent.key');
    expect(result.es).toBe('nonexistent.key');
    expect(result.en).toBe('nonexistent.key');
  });
});

describe('i18n.translate()', () => {
  it('is alias for t()', () => {
    expect(translate('app.name')).toBe(t('app.name'));
  });
});

describe('i18n.setLocale/getLocale', () => {
  it('sets and gets locale', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    setLocale('es');
    expect(getLocale()).toBe('es');
  });

  it('ignores invalid locale', () => {
    setLocale('en');
    setLocale('invalid');
    expect(getLocale()).toBe('en');
  });
});

describe('i18n.getTranslations()', () => {
  it('returns es and en only', () => {
    const translations = getTranslations();
    expect(translations.es).toBeDefined();
    expect(translations.en).toBeDefined();
    expect(Object.keys(translations)).toHaveLength(2);
  });
});
