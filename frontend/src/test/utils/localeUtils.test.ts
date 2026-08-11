import { describe, it, expect, vi, beforeEach } from 'vitest';

const lang = vi.hoisted(() => ({ value: 'es' }));

vi.mock('@/i18n/i18n', () => ({
  default: {
    get language() {
      return lang.value;
    },
  },
}));

vi.mock('date-fns/locale/en-US', () => ({ enUS: { code: 'en-US' } }));
vi.mock('date-fns/locale/pt-BR', () => ({ ptBR: { code: 'pt-BR' } }));
vi.mock('date-fns/locale/fr', () => ({ fr: { code: 'fr' } }));
vi.mock('date-fns/locale/es', () => ({ es: { code: 'es' } }));

import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatCurrency,
  getDateFnsLocale,
  getFullCalendarLocale,
} from '@/shared/utils/localeUtils';

describe('localeUtils', () => {
  beforeEach(() => {
    lang.value = 'es';
  });

  describe('formatDate', () => {
    it('returns an em dash for nullish or invalid dates', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('not-a-date')).toBe('—');
    });

    it('formats a Date object using the active locale', () => {
      const result = formatDate(new Date(2024, 0, 15), { year: 'numeric', month: 'long', day: 'numeric' });
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('formats an ISO date string', () => {
      const result = formatDate('2024-06-01T10:00:00', { year: 'numeric' });
      expect(result).toContain('2024');
    });

    it('uses the locale for the current language', () => {
      lang.value = 'en';
      const result = formatDate(new Date(2024, 0, 15), { year: 'numeric', month: 'long' });
      expect(result).toContain('2024');
    });
  });

  describe('formatDateTime', () => {
    it('returns an em dash for nullish or invalid dates', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatDateTime('invalid')).toBe('—');
    });

    it('formats date and time', () => {
      const result = formatDateTime(new Date(2024, 0, 15, 10, 30));
      expect(result).toContain('2024');
      expect(result).toContain('10');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with locale separators', () => {
      expect(formatNumber(1234.5)).toContain('1.234');
    });

    it('respects formatting options', () => {
      const result = formatNumber(1234.5, { minimumFractionDigits: 2 });
      expect(result).toContain('1.234');
    });
  });

  describe('formatCurrency', () => {
    it('formats CLP by default', () => {
      expect(formatCurrency(1500)).toContain('1.500');
    });

    it('supports other currencies', () => {
      expect(formatCurrency(1500, 'USD')).toContain('1.500');
    });
  });

  describe('getDateFnsLocale', () => {
    it('returns the Spanish locale by default', async () => {
      expect((await getDateFnsLocale()).code).toBe('es');
    });

    it('returns the locale matching the active language', async () => {
      lang.value = 'en';
      expect((await getDateFnsLocale()).code).toBe('en-US');

      lang.value = 'pt';
      expect((await getDateFnsLocale()).code).toBe('pt-BR');

      lang.value = 'fr';
      expect((await getDateFnsLocale()).code).toBe('fr');
    });

    it('falls back to Spanish for unknown languages', async () => {
      lang.value = 'de';
      expect((await getDateFnsLocale()).code).toBe('es');
    });
  });

  describe('getFullCalendarLocale', () => {
    it('maps the active language to a fullcalendar locale', () => {
      expect(getFullCalendarLocale()).toBe('es');

      lang.value = 'en';
      expect(getFullCalendarLocale()).toBe('en');

      lang.value = 'pt';
      expect(getFullCalendarLocale()).toBe('pt-br');

      lang.value = 'fr';
      expect(getFullCalendarLocale()).toBe('fr');

      lang.value = 'unknown';
      expect(getFullCalendarLocale()).toBe('es');
    });
  });
});
