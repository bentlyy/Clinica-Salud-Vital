import { createContext, createElement, useMemo, useState, useEffect } from 'react';

export const I18nContext = createContext(null);

const FALLBACK_LOCALE = 'es';
const KNOWN_LOCALES = ['es', 'en', 'pt', 'fr'];
const LOCALE_KEY = 'app_locale';

let fallbackTranslations = null;
let fallbackInit = null;

const initFallback = async () => {
  if (fallbackTranslations) return fallbackTranslations;
  if (fallbackInit) return fallbackInit;
  fallbackInit = (async () => {
    fallbackTranslations = (await import('./translations')).default;
    return fallbackTranslations;
  })();
  return fallbackInit;
};

export const getStoredLocale = () => {
  return localStorage.getItem(LOCALE_KEY) || navigator.language?.slice(0, 2) || FALLBACK_LOCALE;
};

export const setStoredLocale = (locale) => {
  localStorage.setItem(LOCALE_KEY, locale);
  window.dispatchEvent(new CustomEvent('locale:changed', { detail: locale }));
};

export const useI18n = (locale) => {
  const [translations, setTranslations] = useState(() => {
    if (fallbackTranslations) return fallbackTranslations;
    initFallback().then(setTranslations);
    return {};
  });
  const [localeVersion, setLocaleVersion] = useState(0);

  useEffect(() => {
    if (!fallbackTranslations) {
      initFallback().then(setTranslations);
    }
  }, []);

  useEffect(() => {
    const handler = () => setLocaleVersion((v) => v + 1);
    window.addEventListener('locale:changed', handler);
    return () => window.removeEventListener('locale:changed', handler);
  }, []);

  const currentLocale = locale || getStoredLocale();
  const lang = KNOWN_LOCALES.includes(currentLocale) ? currentLocale : FALLBACK_LOCALE;

  return useMemo(() => {
    const fb = fallbackTranslations || {};
    const dict = translations[lang] || fb[lang];

    const t = (key, params) => {
      let msg = dict?.[key];
      if (!msg) {
        msg = fb[FALLBACK_LOCALE]?.[key] || key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          msg = msg.replace(`{${k}}`, String(v));
        }
      }
      return msg;
    };

    const tAll = (key) => {
      const result = {};
      for (const locale of KNOWN_LOCALES) {
        result[locale] = translations[locale]?.[key] || fb[locale]?.[key] || key;
      }
      return result;
    };

    return { t, tAll, locale: lang };
  }, [lang, translations, localeVersion]);
};

export const I18nProvider = ({ children, locale }) => {
  const i18n = useI18n(locale);
  const safeValue = i18n || { t: (key) => key || '', tAll: () => ({}), locale: 'es' };
  return createElement(I18nContext.Provider, { value: safeValue }, children);
};

export default useI18n;
