import i18n from '@/i18n/i18n';
import type { Locale } from 'date-fns';

function getLocale(): string {
  switch (i18n.language) {
    case 'en': return 'en-US';
    case 'pt': return 'pt-BR';
    case 'fr': return 'fr-FR';
    default: return 'es-CL';
  }
}

export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(getLocale(), options);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(getLocale());
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

export function formatCurrency(value: number, currency = 'CLP'): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getDateFnsLocale(): Promise<Locale> {
  const lang = i18n.language;
  switch (lang) {
    case 'en':
      return (await import('date-fns/locale/en-US')).enUS;
    case 'pt':
      return (await import('date-fns/locale/pt-BR')).ptBR;
    case 'fr':
      return (await import('date-fns/locale/fr')).fr;
    default:
      return (await import('date-fns/locale/es')).es;
  }
}

export function getFullCalendarLocale(): string {
  switch (i18n.language) {
    case 'en': return 'en';
    case 'pt': return 'pt-br';
    case 'fr': return 'fr';
    default: return 'es';
  }
}
