import { describe, it, expect, vi, beforeEach } from 'vitest';
import { t, tAll, getLocale, setLocale, translate, getTranslations } from '../../src/shared/i18n.service.js';

describe('i18n service', () => {
  it('t() returns Spanish translation by default', () => {
    expect(t('clinical_records.save')).toBe('Guardar');
  });

  it('t() returns English when locale specified', () => {
    expect(t('booking.title', 'en')).toBe('Book Appointment');
  });

  it('t() returns the key itself when not found', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('tAll() returns translations for all locales', () => {
    const result = tAll('clinical_records.save');
    expect(result).toHaveProperty('es', 'Guardar');
    expect(result).toHaveProperty('en', 'Save');
  });

  it('tAll() returns key when not found', () => {
    const result = tAll('nonexistent.key');
    expect(Object.values(result).every(v => v === 'nonexistent.key')).toBe(true);
  });

  it('getLocale() returns default locale', () => {
    expect(getLocale()).toBe('es');
  });

  it('setLocale() changes current locale', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('clinical_records.cancel')).toBe('Cancel');
    setLocale('es');
  });

  it('setLocale() ignores invalid locale', () => {
    setLocale('es');
    setLocale('invalid' as never);
    expect(getLocale()).toBe('es');
  });

  it('translate() is an alias for t()', () => {
    expect(translate('clinical_records.save')).toBe('Guardar');
  });

  it('getTranslations() returns all translation data', () => {
    const all = getTranslations();
    expect(all).toHaveProperty('es');
    expect(all).toHaveProperty('en');
    expect(all.es['clinical_records.save']).toBe('Guardar');
  });

  it('t() replaces params in template string', () => {
    const result = t('tenant.welcome', 'es', { name: 'María' });
    expect(result).toBe('Bienvenido, María');
  });

  it('t() handles missing param gracefully', () => {
    const result = t('tenant.welcome', 'es', {});
    expect(result).toBe('Bienvenido, {name}');
  });
});
