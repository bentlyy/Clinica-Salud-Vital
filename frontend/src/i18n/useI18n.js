import { useMemo } from 'react';
import translations from './translations';

const FALLBACK_LOCALE = 'es';

const LOCALE_KEY = 'app_locale';

export const getStoredLocale = () => {
  return localStorage.getItem(LOCALE_KEY) || navigator.language?.slice(0, 2) || FALLBACK_LOCALE;
};

export const setStoredLocale = (locale) => {
  localStorage.setItem(LOCALE_KEY, locale);
};

const supportedLocales = Object.keys(translations);

export const useI18n = (locale) => {
  const currentLocale = locale || getStoredLocale();
  const lang = supportedLocales.includes(currentLocale) ? currentLocale : FALLBACK_LOCALE;

  return useMemo(() => {
    const dict = translations[lang] || translations[FALLBACK_LOCALE];

    const t = (key, params) => {
      let msg = dict[key];
      if (!msg) {
        msg = translations[FALLBACK_LOCALE]?.[key] || key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          msg = msg.replace(`{${k}}`, String(v));
        }
      }
      return msg;
    };

    return { t, locale: lang };
  }, [lang]);
};

export default useI18n;
