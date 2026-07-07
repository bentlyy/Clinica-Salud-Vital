import { createContext, createElement, useMemo, useState, useEffect, type ReactNode } from 'react';
import translations from './translations.js';

export interface I18nValue {
  t: (key: string, params?: Record<string, string>) => string;
  tAll: (key: string) => Record<string, string>;
  locale: string;
}

export const I18nContext = createContext<I18nValue | null>(null);

const FALLBACK_LOCALE = 'es';
const KNOWN_LOCALES = ['es', 'en', 'pt', 'fr'];
const LOCALE_KEY = 'app_locale';

export const getStoredLocale = (): string => {
  return localStorage.getItem(LOCALE_KEY) || navigator.language?.slice(0, 2) || FALLBACK_LOCALE;
};

export const setStoredLocale = (locale: string): void => {
  localStorage.setItem(LOCALE_KEY, locale);
  window.dispatchEvent(new CustomEvent('locale:changed', { detail: locale }));
};

export const useI18n = (locale?: string): I18nValue => {
  const [localeVersion, setLocaleVersion] = useState(0);

  useEffect(() => {
    const handler = () => setLocaleVersion((v) => v + 1);
    window.addEventListener('locale:changed', handler);
    return () => window.removeEventListener('locale:changed', handler);
  }, []);

  const currentLocale = locale || getStoredLocale();
  const lang = KNOWN_LOCALES.includes(currentLocale) ? currentLocale : FALLBACK_LOCALE;

  return useMemo(() => {
    const dict = (translations as Record<string, Record<string, string>>)[lang];

    const t = (key: string, params?: Record<string, string>): string => {
      let msg = dict?.[key];
      if (!msg) {
        msg = (translations as Record<string, Record<string, string>>)[FALLBACK_LOCALE]?.[key] || key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          msg = msg.replace(`{${k}}`, String(v));
        }
      }
      return msg;
    };

    const tAll = (key: string): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const loc of KNOWN_LOCALES) {
        result[loc] = (translations as Record<string, Record<string, string>>)[loc]?.[key] || key;
      }
      return result;
    };

    return { t, tAll, locale: lang };
  }, [lang, localeVersion]);
};

export const I18nProvider = ({ children, locale }: { children: ReactNode; locale?: string }) => {
  const i18n = useI18n(locale);
  const safeValue: I18nValue = i18n || { t: (key: string) => key || '', tAll: () => ({}), locale: 'es' };
  return createElement(I18nContext.Provider, { value: safeValue }, children);
};

export default useI18n;
